import { Lambda, waitUntilFunctionActiveV2 } from "@aws-sdk/client-lambda";
import log from "@multiverse/log";
import type {
    StatefulResponse,
    Worker, WorkerQuery, WorkerQueryResult
} from "./Worker";
import type {
    DatabaseConfiguration, DatabaseID, Region
} from "../core/DatabaseConfiguration";
import { IAM } from "@aws-sdk/client-iam";
import type { StoredVectorChange } from "../ChangesStorage/StoredVector";
import type { DatabaseEnvironment } from "./EnvSchema";
import { databaseEnvSchema } from "./EnvSchema";
import type { AwsToken } from "../core/AwsToken";

const logger = log.getSubLogger({ name: "LambdaWorker" });

export default class LambdaWorker implements Worker {

    private lambda: Lambda;

    constructor(private options: {
        lambdaName: string;
        region: Region;
        waitTime?: number;
        awsToken: AwsToken
    }) {
        this.lambda = new Lambda({
            region: options.region,
            credentials: options.awsToken
        });
    }

    public async state(): Promise<StatefulResponse<void>> {
        return await this.invoke({
            event: "state",
            payload: []
        });
    }

    public async query(query: WorkerQuery): Promise<StatefulResponse<WorkerQueryResult>> {
        return await this.invoke({
            event: "query",
            payload: [query]
        });
    }

    public async update(updates: StoredVectorChange[]): Promise<StatefulResponse<void>> {
        return await this.invoke({
            event: "update",
            payload: [updates]
        });
    }

    public async saveSnapshot(): Promise<StatefulResponse<void>> {
        return await this.invoke({
            event: "saveSnapshot",
            payload: []
        });
    }

    public async saveSnapshotWithUpdates(): Promise<StatefulResponse<{changesFlushed: number}>> {
        return await this.invoke({
            event: "saveSnapshotWithUpdates",
            payload: []
        });
    }

    public async loadLatestSnapshot(): Promise<StatefulResponse<void>> {
        return await this.invoke({
            event: "loadLatestSnapshot",
            payload: []
        });
    }

    public async count(): Promise<StatefulResponse<{ vectors: number; vectorDimensions: number; }>> {
        return await this.invoke({
            event: "count",
            payload: []
        });
    }

    private async lambdaRoleARN(): Promise<string> {
        const iam = new IAM({
            region: this.options.region,
            credentials: this.options.awsToken
        });

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

        log.debug("Created role", { result });

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

        // add s3express:* for s3 express
        if (!await iam.getPolicy({ PolicyArn: "arn:aws:iam::aws:policy/multiverse-s3express-policy" }).catch(() => null)) {
            await iam.createPolicy({
                PolicyDocument: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: "s3express:*",
                            Resource: "*"
                        }
                    ]
                }),
                PolicyName: "multiverse-s3express-policy"
            });
        }

        log.debug(await iam.attachRolePolicy({
            PolicyArn: "arn:aws:iam::aws:policy/multiverse-s3express-policy",
            RoleName: roleName
        }));

        // ! remove role if changing policies

        log.debug("Created role", { result });

        const roleARN = result.Role?.Arn;

        if (!roleARN) {
            throw new Error("Failed to create role");
        }

        return roleARN;
    }

    public async deploy(options: {
        partition: number,
        snapshotBucket: string,
        changesStorage: string,
        env: "development" | "production",
        configuration: DatabaseConfiguration,
        databaseId: DatabaseID
    }) {

        const variables: DatabaseEnvironment = {
            DATABASE_CONFIG: options.configuration,
            DATABASE_IDENTIFIER: options.databaseId,
            PARTITION: options.partition,
            SNAPSHOT_BUCKET: options.snapshotBucket,
            NODE_ENV: options.env,
            BUCKET_CHANGES_STORAGE: options.changesStorage
        };

        databaseEnvSchema.parse(variables);

        if (!process.env.AWS_ECR) {
            throw new Error("AWS_ECR environment variable is not set");
        }

        const result = await this.lambda.createFunction({
            FunctionName: this.options.lambdaName,
            Code: { ImageUri: process.env.AWS_ECR + "/multiverse-compute:latest" },
            Role: await this.lambdaRoleARN(),
            PackageType: "Image",
            Timeout: 900,
            MemorySize: 2048,
            EphemeralStorage: { Size: 1024 },
            Environment: {
                Variables: {
                    VARIABLES: JSON.stringify(variables),
                    NODE_ENV: options.env,
                    NODE_OPTIONS: "--enable-source-maps",
                    LOG_LEVEL: "6"
                }
            },
        });

        logger.debug("Created compute lambda", { result });

        await waitUntilFunctionActiveV2({
            client: this.lambda,
            maxWaitTime: 600,
        }, { FunctionName: result.FunctionName ?? "undefined" });
    }

    public async destroy() {
        await this.lambda.deleteFunction({ FunctionName: this.options.lambdaName });

        logger.debug("Deleted compute lambda", { lambdaName: this.options.lambdaName });
    }

    private async invoke(payload: any): Promise<any> {

        const payloadWithMetadata = {
            ...payload,
            waitTime: this.options.waitTime
        };

        console.trace("Invoking lambda", {
            lambdaName: this.options.lambdaName,
            payload
        });

        const result = await this.lambda.invoke({
            FunctionName: this.options.lambdaName,
            Payload: JSON.stringify({ body: JSON.stringify(payloadWithMetadata) })
        });

        const uintPayload = new Uint8Array(result.Payload as unknown as Buffer);
        const payloadString = Buffer.from(uintPayload).toString("utf-8");

        try {
            const parsedPayload = JSON.parse(payloadString);

            if (result.FunctionError || parsedPayload.statusCode !== 200) {
                throw new Error(parsedPayload.body);
            }

            return parsedPayload.body && JSON.parse(parsedPayload.body);
        } catch (e) {
            throw new Error(payloadString);
        }

    }
}