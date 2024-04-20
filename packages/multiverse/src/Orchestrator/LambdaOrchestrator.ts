import {
    Architecture, Lambda, Runtime, waitUntilPublishedVersionActive
} from "@aws-sdk/client-lambda";
import type {
    DatabaseConfiguration, DatabaseID, StoredDatabaseConfiguration, Token
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

const log = logger.getSubLogger({ name: "LambdaOrchestrator" });

export default class LambdaOrchestrator implements Orchestrator {

    private lambda: Lambda;

    constructor(private options: {
        databaseId: DatabaseID;
        secretToken: string;

    }) {
        this.lambda = new Lambda({ region: options.databaseId.region });
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
        return this.request("addVectors", [vectors]);
    }

    public async removeVectors(labels: string[]): Promise<void> {
        return this.request("removeVectors", [labels]);
    }

    public async getConfiguration(): Promise<DatabaseConfiguration> {
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
     * Builds the orchestrator lambda function and zips it.
     */
    public async build(): Promise<Uint8Array> {
        const { exec } = await import("child_process");

        // build with no splitting, minifed and no sourcemaps from packages/multiverse/src/Orchestrator/Orchestrator.ts
        const build = exec("pnpm build:orchestrator");

        build.stdout?.pipe(process.stdout);
        build.stderr?.pipe(process.stderr);

        await new Promise((resolve, reject) => {
            build.on("exit", (code) => {
                if (code === 0) {
                    resolve(null);
                } else {
                    reject(new Error(`Build failed with exit code ${code}`));
                }
            });
        });

        log.debug("Build finished");

        // 2. zip the build folder using adm
        const { default: AdmZip } = await import("adm-zip");
        const zip = new AdmZip();

        zip.addLocalFolder("packages/multiverse/src/Orchestrator/dist");

        const buffer = zip.toBuffer();

        log.debug("Zip created");

        return buffer;
    }

    public lambdaName() {
        return `multiverse-orchestrator-${this.options.databaseId.name}`;
    }

    public lambdaWorkerName(partition: number, type: "primary" | "fallback") {
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

        // add policy AWSLambdaBasicExecutionRole
        await iam.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        });

        // add dynamodb policy
        await iam.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
        });

        // add lambda:InvokeFunction
        await iam.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
        });

        // add s3 policy
        await iam.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
        });

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

        const result = await this.lambda.createFunction({
            Code: { ZipFile: await this.build(), },
            FunctionName: this.lambdaName(),
            Role: await this.lambdaRoleARN(),
            Runtime: Runtime.nodejs18x,
            Architectures: [Architecture.arm64],
            Handler: "packages/multiverse/Orchestrator/dist/index.handler",
            Timeout: 60,
            Environment: {
                Variables: {
                    NODE_ENV: process.env.NODE_ENV ?? "development",
                    VARIABLES: JSON.stringify(variables),
                }
            }
        });

        log.debug("Created orchestrator lambda", { result });

        if (!result.FunctionArn) throw new Error("Failed to create orchestrator lambda");

        // wait for lambda to be created
        await waitUntilPublishedVersionActive({
            client: this.lambda,
            maxWaitTime: 120,
        }, { FunctionName: this.lambdaName(), });

        log.debug("Orchestrator lambda is active");
        // return result.FunctionArn;
    }

    private async deployPartition({
        changesTable, snapshotBucket, env, partition, databaseConfiguration
    }: {
        changesTable: string;
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
            region: this.options.databaseId.region
        });

        await lambdaWorker.deploy({
            changesTable,
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
            region: this.options.databaseId.region
        });

        await lambdaWorker.destroy();

        log.info("Destroyed partition", { partition });
    }

    public async deploy({
        changesTable, snapshotBucket, infrastructureTable, databaseConfiguration
    }: {
        changesTable: string;
        snapshotBucket: string;
        infrastructureTable: string;
        databaseConfiguration: StoredDatabaseConfiguration;
    }) {
        const infrastructureStorage = new DynamoInfrastructureStorage({
            region: this.options.databaseId.region,
            tableName: infrastructureTable
        });

        const infrastructure = await infrastructureStorage.get(this.options.databaseId.name);

        if (infrastructure) {
            throw new Error("Infrastructure already exists");
        }

        await infrastructureStorage.set(this.options.databaseId.name, {
            configuration: databaseConfiguration,
            databaseId: this.options.databaseId,
            partitions: [{
                lambda: [{
                    instances: [],
                    name: this.lambdaWorkerName(0, "primary"),
                    region: this.options.databaseId.region,
                    type: "primary",
                    wakeUpInstances: 1,
                }],
                partitionIndex: 0
            }],
            scalingTargetConfiguration: {
                outOfRegionFallbacks: 0,
                secondaryFallbacks: 0,
                warmPrimaryInstances: 1,
                warmRegionalInstances: 0,
                warmSecondaryInstances: 0
            }
        });

        await Promise.all([
            this.deployOrchestratorLambda({
                changesTable,
                snapshotBucket,
                infrastructureTable,
                databaseConfiguration
            }),
            this.deployPartition({
                changesTable,
                snapshotBucket,
                env: "production",
                partition: 0,
                databaseConfiguration
            })
        ]);
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

        const result = await this.lambda.deleteFunction({ FunctionName: this.lambdaName(), });

        await this.destroyPartition({ partition: 0 });

        log.debug("Deleted lambda function", { result, });
    }
}