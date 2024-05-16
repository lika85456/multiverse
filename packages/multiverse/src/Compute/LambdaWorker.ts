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

    public async saveSnapshotWithUpdates(updates: StoredVectorChange[]): Promise<StatefulResponse<void>> {
        return await this.invoke({
            event: "saveSnapshotWithUpdates",
            payload: [updates]
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
        };

        databaseEnvSchema.parse(variables);

        const result = await this.lambda.createFunction({
            FunctionName: this.options.lambdaName,
            Code: { ImageUri: "529734186765.dkr.ecr.eu-central-1.amazonaws.com/multiverse-compute:latest" },
            Role: await this.lambdaRoleARN(),
            PackageType: "Image",
            Timeout: 900,
            MemorySize: 512,
            EphemeralStorage: { Size: 1024 },
            Environment: {
                Variables: {
                    VARIABLES: JSON.stringify(variables),
                    NODE_ENV: options.env,
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

        log.debug("Invoking lambda", {
            lambdaName: this.options.lambdaName,
            payload: payloadWithMetadata
        });

        const result = await this.lambda.invoke({
            FunctionName: this.options.lambdaName,
            Payload: JSON.stringify({ body: JSON.stringify(payloadWithMetadata) })
        });

        const uintPayload = new Uint8Array(result.Payload as ArrayBuffer);
        const payloadString = Buffer.from(uintPayload).toString("utf-8");
        const parsedPayload = JSON.parse(payloadString);

        log.debug("Lambda invoked", {
            lambdaName: this.options.lambdaName,
            result: parsedPayload
        });

        if (result.FunctionError) {
            log.error(JSON.stringify(parsedPayload, null, 4));
            throw new Error(parsedPayload);
        }

        return parsedPayload.body && JSON.parse(parsedPayload.body);
    }
}