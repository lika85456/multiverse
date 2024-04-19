import { IAM } from "@aws-sdk/client-iam";
import type { Environment } from "@aws-sdk/client-lambda";
import {
    Lambda, PackageType, waitUntilFunctionActive
} from "@aws-sdk/client-lambda";
import type { storedDatabaseConfiguration } from "../../core/DatabaseConfiguration";
import type InfrastructureStorage from "../../InfrastructureStorage/DynamoInfrastructureStorage";
import type { DatabaseInfrastructure } from "../../InfrastructureStorage/DynamoInfrastructureStorage";
import log from "@multiverse/log";
import type { DatabaseEnvironment } from "../../Compute/env";
import OrchestratorDeployer from "./OrchestratorDeployer";

export default class InfrastructureManager {

    private lambda: Lambda;
    private orchestratorDeployer: OrchestratorDeployer;

    constructor(private options: {
        indexConfiguration: IndexConfiguration;
        infrastructureStorage: InfrastructureStorage;
        changesTable: string;
        snapshotBucket: string;

    }) {
        this.lambda = new Lambda({ region: options.indexConfiguration.region });
        this.orchestratorDeployer = new OrchestratorDeployer({
            changesTable: options.changesTable,
            databaseConfiguration: options.indexConfiguration,
            snapshotBucket: options.snapshotBucket,
            infrastructureTable: options.infrastructureStorage.tableName()
        });
    }

    public async getInfrastructure(): Promise<DatabaseInfrastructure | undefined> {
        const result = await this.options.infrastructureStorage.getInfrastructure(this.options.indexConfiguration);

        return result;
    }

    /**
     *
     * @returns ARN of the role to be used in database lambda. It is created if does not exist.
     */
    private async lambdaRoleARN(): Promise<string> {
        const iam = new IAM({ region: this.options.indexConfiguration.region });

        const roleName = "multiverse-database-role";

        const role = await iam.getRole({ RoleName: roleName }).catch(() => null);

        if (role?.Role?.Arn) {
            return role.Role.Arn;
        }

        // TODO!: add *proper* permissions
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
        await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            RoleName: roleName
        });

        // add dynamodb policy
        await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
            RoleName: roleName
        });

        // add invoke policy
        await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/AWSLambdaRole",
            RoleName: roleName
        });

        log.debug("Created role", { result });

        const roleARN = result.Role?.Arn;

        if (!roleARN) {
            throw new Error("Failed to create role");
        }

        return roleARN;
    }

    private lambdaName(partition: number) {
        return `multiverse-database-${this.options.indexConfiguration.owner}-${this.options.indexConfiguration.indexName}-${partition}`;
    }

    /**
     * Deploys orchestrator and first partition. Also saves infrastructure to storage.
     */
    public async deploy() {

        log.debug("Deploying infrastructure", { indexConfiguration: this.options.indexConfiguration });

        const infrastructure = await this.getInfrastructure();

        if (infrastructure) {
            throw new Error("Infrastructure already exists");
        }

        const orchestratorLambdaName = await this.orchestratorDeployer.deploy();

        log.debug("Deployed orchestrator", { orchestratorLambdaName });

        const newInfrastructure: DatabaseInfrastructure = {
            configuration: this.options.indexConfiguration,
            partitions: []
        };

        await this.options.infrastructureStorage.setInfrastructure(newInfrastructure);

        await this.addPartition();
    }

    public async addPartition() {
        const infrastructure = await this.getInfrastructure();

        if (!infrastructure) {
            throw new Error("Infrastructure not initialized while adding partition");
        }

        const partitionIndex = infrastructure.partitions.length;

        log.debug("Adding partition", {
            partitionIndex,
            lambdaName: this.lambdaName(partitionIndex)
        });

        // 1. deploy lambda
        const result = await this.lambda.createFunction({
            FunctionName: this.lambdaName(partitionIndex),
            Code: { ImageUri: "529734186765.dkr.ecr.eu-central-1.amazonaws.com/multiverse:latest" },
            Role: await this.lambdaRoleARN(),
            PackageType: PackageType.Image,
            Timeout: 900,
            MemorySize: 512,
            EphemeralStorage: { Size: 1024 },
            Environment: {
                Variables: {
                    DATABASE_CONFIG: JSON.stringify(this.options.indexConfiguration) as unknown,
                    PARTITION: partitionIndex.toString() as unknown,
                    CHANGES_TABLE: this.options.changesTable,
                    SNAPSHOT_BUCKET: this.options.snapshotBucket,
                    NODE_ENV: process.env.NODE_ENV ?? "development",
                } as DatabaseEnvironment & Environment["Variables"]
            }
        });
        log.debug("Created database lambda", { result });

        // 2. add partition to infrastructure
        const newInfrastructure: DatabaseInfrastructure = {
            ...infrastructure,
            partitions: [
                ...infrastructure.partitions,
                {
                    lambda: [{
                        active: true,
                        name: result.FunctionName ?? "undefined",
                        region: this.options.indexConfiguration.region,
                        instances: []
                    }],
                    partition: partitionIndex
                }
            ]
        };

        await this.options.infrastructureStorage.setInfrastructure(newInfrastructure);

        await waitUntilFunctionActive({
            client: this.lambda,
            maxWaitTime: 600
        }, { FunctionName: result.FunctionName ?? "undefined" });

        log.debug(`Database lambda ${result.FunctionName} is active`);
    }

    public async destroy() {

        log.debug("Destroying infrastructure", { indexConfiguration: this.options.indexConfiguration });

        // destroy orchestrator function and all partition lambdas
        const infrastructure = await this.options.infrastructureStorage.getInfrastructure(this.options.indexConfiguration);

        if (!infrastructure) {
            log.debug("Infrastructure to destroy does not exist");

            return;
        }

        const lambda = new Lambda({ region: this.options.indexConfiguration.region });

        await Promise.all([
            // destroy database lambdas
            ...infrastructure.partitions.map(async(partition) => {
                for (const dbLambda of partition.lambda) {
                    log.debug("Deleting lambda", { name: dbLambda.name });
                    await lambda.deleteFunction({ FunctionName: dbLambda.name }).catch(log.error);
                }
            }),
            // destroy orchestrator lambda
            this.orchestratorDeployer.destroy()
        ]);

        await this.options.infrastructureStorage.removeInfrastructure({
            owner: this.options.indexConfiguration.owner,
            indexName: this.options.indexConfiguration.indexName
        });
    }

}