import { IAM } from "@aws-sdk/client-iam";
import type { Environment } from "@aws-sdk/client-lambda";
import {
    Lambda, PackageType, waitUntilFunctionActive
} from "@aws-sdk/client-lambda";
import type { IndexConfiguration } from "../IndexConfiguration";
import type InfrastructureStorage from "./InfrastructureStorage";
import type { DatabaseInfrastructure } from "./InfrastructureStorage";
import log from "@multiverse/log";
import type { DatabaseEnvironment } from "../Database/DatabaseEnvironment";

export default class InfrastructureManager {

    private infrastructure: Promise<DatabaseInfrastructure>;
    private lambda: Lambda;

    constructor(private options: {
        indexConfiguration: IndexConfiguration;
        orchestratorLambdaName: string;
        infrastructureStorage: InfrastructureStorage;
        changesTable: string;
        snapshotBucket: string;

    }) {
        this.lambda = new Lambda({ region: options.indexConfiguration.region });
        this.infrastructure = this.getInfrastructure();
    }

    public async getInfrastructure(): Promise<DatabaseInfrastructure> {
        const result = await this.options.infrastructureStorage.getInfrastructure({
            indexName: this.options.indexConfiguration.indexName,
            owner: this.options.indexConfiguration.owner
        });

        if (!result) {
            return {
                configuration: this.options.indexConfiguration,
                partitions: [],
                orchestratorLambdaName: this.options.orchestratorLambdaName
            };
        }

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
                    },
                    {
                        Effect: "Allow",
                        Principal: { Service: "dynamodb.amazonaws.com", },
                        Action: "sts:AssumeRole",
                    }
                ],
            }),
            RoleName: roleName,
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

    public async addPartition() {
        const partitionIndex = (await this.infrastructure).partitions.length;

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
                    INDEX_CONFIG: JSON.stringify(this.options.indexConfiguration) as unknown,
                    PARTITION: partitionIndex.toString() as unknown,
                    CHANGES_TABLE: this.options.changesTable,
                    SNAPSHOT_BUCKET: this.options.snapshotBucket,
                    NODE_ENV: process.env.NODE_ENV ?? "development",
                } as DatabaseEnvironment & Environment["Variables"]
            }
        });
        log.debug("Created database lambda", { result });

        await waitUntilFunctionActive({
            client: this.lambda,
            maxWaitTime: 600
        }, { FunctionName: result.FunctionName ?? "undefined" });

        log.debug(`Database lambda ${result.FunctionName} is active`);

        // 2. add partition to infrastructure
        const newInfrastructure: DatabaseInfrastructure = {
            ...(await this.infrastructure),
            partitions: [
                ...(await this.infrastructure).partitions,
                {
                    lambda: [{
                        active: true,
                        name: result.FunctionName ?? "undefined",
                        region: this.options.indexConfiguration.region
                    }],
                    partition: partitionIndex
                }
            ]
        };

        await this.options.infrastructureStorage.setInfrastructure(newInfrastructure);
    }

    public async destroy() {
        // destroy orchestrator function and all partition lambdas
        const infrastructure = await this.options.infrastructureStorage.getInfrastructure({
            owner: this.options.indexConfiguration.owner,
            indexName: this.options.indexConfiguration.indexName
        });

        if (!infrastructure) {
            return;
        }

        const lambda = new Lambda({ region: this.options.indexConfiguration.region });

        // destroy orchestrator
        // await lambda.deleteFunction({ FunctionName: infrastructure.orchestratorLambdaName });

        // // destroy partitions
        // for (const partition of infrastructure.partitions) {
        //     for (const dbLambda of partition.lambda) {
        //         log.debug("Deleting lambda", { name: dbLambda.name });
        //         await lambda.deleteFunction({ FunctionName: dbLambda.name }).catch(log.error);
        //     }
        // }

        await Promise.all(infrastructure.partitions.map(async(partition) => {
            for (const dbLambda of partition.lambda) {
                log.debug("Deleting lambda", { name: dbLambda.name });
                await lambda.deleteFunction({ FunctionName: dbLambda.name }).catch(log.error);
            }
        }));

        await this.options.infrastructureStorage.removeInfrastructure({
            owner: this.options.indexConfiguration.owner,
            indexName: this.options.indexConfiguration.indexName
        });
    }

}