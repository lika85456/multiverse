import {
    Architecture, Lambda, Runtime, waitUntilPublishedVersionActive
} from "@aws-sdk/client-lambda";
import type {
    DatabaseID, StoredDatabaseConfiguration, Token
} from "../core/DatabaseConfiguration";
import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";
import type Orchestrator from "./Orchestrator";
import logger from "@multiverse/log";
import { IAM } from "@aws-sdk/client-iam";
import type { OrchestratorEnvironment } from "./EnvSchema";
import { orchestratorEnvSchema } from "./EnvSchema";
import DynamoInfrastructureStorage from "../InfrastructureStorage/DynamoInfrastructureStorage";
import LambdaWorker from "../Compute/LambdaWorker";
import type { OrchestratorEvent } from "./Orchestrator";
import fs from "fs/promises";
import type { AwsToken } from "../core/AwsToken";
import type { WorkerType } from "../Compute/Worker";
import type { ScalingTargetConfiguration } from "../InfrastructureStorage";

const log = logger.getSubLogger({ name: "LambdaOrchestrator" });

export default class LambdaOrchestrator implements Orchestrator {

    private lambda: Lambda;
    private MAXIMUM_PAYLOAD_SIZE = 3 * 1024 * 1024;

    constructor(private options: {
        databaseId: DatabaseID;
        secretToken: string;
        awsToken: AwsToken
    }) {
        this.lambda = new Lambda({
            region: options.databaseId.region,
            credentials: options.awsToken
        });
    }

    public async initialize() {
        // noop
    }

    private async request<T extends keyof Orchestrator>(
        event: T,
        payload: Parameters<Orchestrator[T]>
    ): Promise<ReturnType<Orchestrator[T]>> {

        const eventPayload: OrchestratorEvent = {
            event,
            payload,
            secretToken: this.options.secretToken
        };

        const result = await this.lambda.invoke({
            FunctionName: this.lambdaName(),
            Payload: JSON.stringify({ body: JSON.stringify(eventPayload) })
        });

        const uintPayload = new Uint8Array(result.Payload as ArrayBuffer);
        const payloadString = Buffer.from(uintPayload).toString("utf-8");
        const parsedPayload = JSON.parse(payloadString);

        log.debug("Orchestrator invoked", {
            lambdaName: this.lambdaName(),
            request: eventPayload,
            response: parsedPayload
        });

        if (result.FunctionError) {
            log.error(JSON.stringify(parsedPayload, null, 4));
            throw new Error(parsedPayload);
        }

        return parsedPayload.body && JSON.parse(parsedPayload.body);
    }

    public async query(query: Query): Promise<QueryResult> {
        return this.request("query", [query]);
    }

    public async addVectors(vectors: NewVector[]): Promise<void> {
        const payloadByteSize = JSON.stringify(vectors).length;

        if (payloadByteSize > this.MAXIMUM_PAYLOAD_SIZE) {
            // split into multiple addVector calls and return a promise.all
            const callsToMake = Math.ceil(payloadByteSize / this.MAXIMUM_PAYLOAD_SIZE);
            const vectorChunkSize = Math.ceil(vectors.length / callsToMake);

            const promises = [];
            for (let i = 0; i < callsToMake; i++) {
                const start = i * vectorChunkSize;
                const end = Math.min((i + 1) * vectorChunkSize, vectors.length);

                promises.push(this.request("addVectors", [vectors.slice(start, end)]));
            }

            await Promise.all(promises);

            return;
        }

        return this.request("addVectors", [vectors]);
    }

    public async removeVectors(labels: string[]): Promise<void> {
        return this.request("removeVectors", [labels]);
    }

    public async getConfiguration(): Promise<StoredDatabaseConfiguration> {
        return this.request("getConfiguration", []);
    }

    public async addToken(token: Token): Promise<void> {
        return this.request("addToken", [token]);
    }

    public async removeToken(tokenName: string): Promise<void> {
        return this.request("removeToken", [tokenName]);
    }

    public async auth(secret: string): Promise<boolean> {
        return this.request("auth", [secret]);
    }

    /**
     * TODO! run build only on test environment.
     * Builds the orchestrator lambda function and zips it.
     */
    public async build(): Promise<Uint8Array> {
        // 2. zip the build folder using adm
        const { default: AdmZip } = await import("adm-zip");
        const zip = new AdmZip();

        const buildFolderPaths = [
            "../../packages/multiverse/src/Orchestrator/dist",
            "packages/multiverse/src/Orchestrator/dist",
            "apps/multiverse-ui/public/orchestrator",
            "../../apps/multiverse-ui/public/orchestrator",
            "public/orchestrator",
            "src/lib/orchestrator"
        ];

        // check which build folder path contains the build (contains index.js file)
        let buildFolderPath: string | undefined = undefined;
        for (const path of buildFolderPaths) {
            try {
                await fs.access(path);
                buildFolderPath = path;
                break;
            } catch (e) {
                // ignore
            }
        }

        if (!buildFolderPath) {
            throw new Error("Build folder not found. Did you build orchestrator?");
        }

        zip.addLocalFolder(buildFolderPath);

        const buffer = zip.toBuffer();

        log.debug("Zip created");

        return buffer;
    }

    public lambdaName() {
        return `multiverse-orchestrator-${this.options.databaseId.name}`;
    }

    public lambdaWorkerName(partition: number, type: WorkerType) {
        return `multiverse-worker-${this.options.databaseId.name}-${partition}-${type}`;
    }

    private async lambdaRoleARN(): Promise<string> {
        // if doesn't exist, create
        const iam = new IAM({ region: this.options.databaseId.region });

        const roleName = "multiverse-orchestrator-role";

        const role = await iam.getRole({ RoleName: roleName }).catch(() => null);

        if (role?.Role?.Arn) {
            return role.Role.Arn;
        }

        /**
         * Create role that allows lambda access to dynamodb and to create and manage lambda functions.
         */

        const result = await iam.createRole({
            AssumeRolePolicyDocument: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: { Service: "lambda.amazonaws.com", },
                        Action: "sts:AssumeRole",
                    }
                ],
            }),
            RoleName: roleName,
        });

        // add logs policy
        log.debug(await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            RoleName: roleName
        }));

        // add dynamodb policy
        log.debug(await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
            RoleName: roleName
        }));

        // add invoke policy
        log.debug(await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
            RoleName: roleName
        }));

        // add s3 policy
        log.debug(await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
            RoleName: roleName
        }));

        // add sqs policy
        log.debug(await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
            RoleName: roleName
        }));

        log.debug("Created role", { result, });

        const roleARN = result.Role?.Arn;

        if (!roleARN) {
            throw new Error("Failed to create role");
        }

        return roleARN;
    }

    private async deployOrchestratorLambda({
        changesTable, snapshotBucket, infrastructureTable, databaseConfiguration
    }: {
        changesTable: string;
        snapshotBucket: string;
        infrastructureTable: string;
        databaseConfiguration: StoredDatabaseConfiguration;
    }) {
        log.debug("Deploying orchestrator lambda function", { configuration: databaseConfiguration });

        const variables: OrchestratorEnvironment = {
            CHANGES_TABLE: changesTable,
            DATABASE_CONFIG: databaseConfiguration,
            SNAPSHOT_BUCKET: snapshotBucket,
            INFRASTRUCTURE_TABLE: infrastructureTable,
            DATABASE_IDENTIFIER: this.options.databaseId,
            NODE_ENV: (process.env.NODE_ENV ?? "development") as any,
        };

        orchestratorEnvSchema.parse(variables);

        let result;
        let tries = 0;
        while (tries < 3) {
            try {
                result = await this.lambda.createFunction({
                    // Code: { ZipFile: await this.build(), },
                    Code: {
                        // eslint-disable-next-line turbo/no-undeclared-env-vars
                        S3Bucket: process.env.ORCHESTRATOR_SOURCE_BUCKET,
                        S3Key: "orchestrator.zip"
                    },
                    FunctionName: this.lambdaName(),
                    Role: await this.lambdaRoleARN(),
                    Runtime: Runtime.nodejs18x,
                    Architectures: [Architecture.arm64],
                    Handler: "index.handler",
                    Timeout: 60,
                    Environment: {
                        Variables: {
                            NODE_ENV: process.env.NODE_ENV ?? "development",
                            VARIABLES: JSON.stringify(variables),
                        }
                    }
                });

                break;
            } catch (e) {
                log.error("Failed to create orchestrator lambda", { error: e });
                tries++;
            }

            const backoffs = [0, 2000, 10000, 20000];
            await new Promise(resolve => setTimeout(resolve, backoffs[tries]));
        }

        if (!result || !result.FunctionArn) throw new Error("Failed to create orchestrator lambda");

        log.debug("Created orchestrator lambda", { result });

        // wait for lambda to be created
        await waitUntilPublishedVersionActive({
            client: this.lambda,
            maxWaitTime: 120,
        }, { FunctionName: this.lambdaName(), });

        log.debug("Orchestrator lambda is active");
        // return result.FunctionArn;
    }

    private async deployPartition({
        snapshotBucket, env, partition, databaseConfiguration
    }: {
        snapshotBucket: string;
        env: "development" | "production";
        partition: number;
        databaseConfiguration: StoredDatabaseConfiguration;
    }) {

        log.info("Deploying partition", {
            partition,
            env
        });

        const lambdaWorker = new LambdaWorker({
            lambdaName: this.lambdaWorkerName(partition, "primary"),
            region: this.options.databaseId.region,
            awsToken: this.options.awsToken
        });

        await lambdaWorker.deploy({
            snapshotBucket,
            configuration: databaseConfiguration,
            databaseId: this.options.databaseId,
            env,
            partition
        });

        log.info("Deployed partition", {
            partition,
            env
        });
    }

    private async destroyPartition({ partition }: {
        partition: number;
    }) {
        log.info("Destroying partition", { partition });

        const lambdaWorker = new LambdaWorker({
            lambdaName: this.lambdaWorkerName(partition, "primary"),
            region: this.options.databaseId.region,
            awsToken: this.options.awsToken
        });

        await lambdaWorker.destroy();

        log.info("Destroyed partition", { partition });
    }

    public async deploy({
        changesTable, snapshotBucket, infrastructureTable, databaseConfiguration, scalingTargetConfiguration
    }: {
        changesTable: string;
        snapshotBucket: string;
        infrastructureTable: string;
        databaseConfiguration: StoredDatabaseConfiguration;
        scalingTargetConfiguration: ScalingTargetConfiguration;
    }) {
        const infrastructureStorage = new DynamoInfrastructureStorage({
            region: this.options.databaseId.region,
            tableName: infrastructureTable,
            awsToken: this.options.awsToken
        });

        const infrastructure = await infrastructureStorage.get(this.options.databaseId.name);

        if (infrastructure) {
            throw new Error("Infrastructure already exists");
        }

        const errors: Error[] = [];

        await Promise.all([
            this.deployOrchestratorLambda({
                changesTable,
                snapshotBucket,
                infrastructureTable,
                databaseConfiguration
            }).catch(e => errors.push(e)),
            this.deployPartition({
                snapshotBucket,
                env: "production",
                partition: 0,
                databaseConfiguration
            }).catch(e => errors.push(e)),
        ]);

        if (errors.length > 0) {
            log.error("Failed to deploy orchestrator. Destroying created resources", { errors });

            await Promise.allSettled([
                this.destroyPartition({ partition: 0 }).catch(e => e),
                (async() => {
                    try {
                        await this.lambda.deleteFunction({ FunctionName: this.lambdaName(), });
                        log.debug("Deleted orchestrator lambda");
                    } catch (e) {
                        log.error("Failed to delete orchestrator lambda", { error: e });
                    }
                })()
            ]);

            throw new Error(`Failed to deploy orchestrator: ${errors.map(e => e.message).join(", ")}`);
        }

        await infrastructureStorage.set(this.options.databaseId.name, {
            configuration: databaseConfiguration,
            databaseId: this.options.databaseId,
            partitions: [{
                // lambda: [{
                //     instances: [],
                //     name: this.lambdaWorkerName(0, "primary"),
                //     region: this.options.databaseId.region,
                //     type: "primary",
                //     wakeUpInstances: 1,
                // }],
                lambda: [
                    // primary
                    {
                        instances: [],
                        name: this.lambdaWorkerName(0, "primary"),
                        region: this.options.databaseId.region,
                        type: "primary",
                        wakeUpInstances: scalingTargetConfiguration.warmPrimaryInstances
                    },
                    // secondary
                    ...Array.from({ length: scalingTargetConfiguration.secondaryFallbacks }, () => ({
                        instances: [],
                        name: this.lambdaWorkerName(0, "secondary"),
                        region: this.options.databaseId.region,
                        type: "secondary" as const,
                        wakeUpInstances: scalingTargetConfiguration.warmSecondaryInstances
                    })),
                    // regional SKIP
                    // ...Array.from({ length: scalingTargetConfiguration.outOfRegionFallbacks }, (_, i) => ({
                    //     instances: [],
                    //     name: this.lambdaWorkerName(0, "regional"),
                    //     region: this.options.databaseId.region,
                    //     type: "regional" as const,
                    //     wakeUpInstances: scalingTargetConfiguration.warmRegionalInstances
                    // })
                ],
                partitionIndex: 0
            }],
            scalingTargetConfiguration
        });
    }

    public async updateCode() {
        const result = await this.lambda.updateFunctionCode({
            FunctionName: this.lambdaName(),
            ZipFile: await this.build(),
        });

        log.debug("Updated lambda function code", { result, });
    }

    public async updateConfiguration() {
        const result = await this.lambda.updateFunctionConfiguration({
            FunctionName: this.lambdaName(),
            Role: await this.lambdaRoleARN(),
            Runtime: Runtime.nodejs18x,
            Handler: "packages/multiverse/Orchestrator/dist/Orchestrator.handler",
        });

        log.debug("Updated lambda function configuration", { result, });
    }

    public async destroy() {
        await Promise.allSettled([
            this.destroyPartition({ partition: 0 }),
            (async() => {
                try {
                    await this.lambda.deleteFunction({ FunctionName: this.lambdaName(), });
                    log.debug("Deleted orchestrator lambda");
                } catch (e) {
                    log.error("Failed to delete orchestrator lambda", { error: e });
                }
            })()
        ]);
    }
}