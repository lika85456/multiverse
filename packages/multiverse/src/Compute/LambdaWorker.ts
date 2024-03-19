import type { Environment } from "@aws-sdk/client-lambda";
import { Lambda, waitUntilFunctionActiveV2 } from "@aws-sdk/client-lambda";
import log from "@multiverse/log";
import type {
    Worker, WorkerQuery, WorkerQueryResult
} from "./Worker";
import type { DatabaseEnvironment } from "./env";
import type { DatabaseConfiguration } from "../DatabaseConfiguration";
import { IAM } from "@aws-sdk/client-iam";

const logger = log.getSubLogger({ name: "LambdaWorker" });

export default class LambdaWorker implements Worker {

    private lambda: Lambda;

    constructor(private lambdaName: string, private configuration: DatabaseConfiguration) {
        this.lambda = new Lambda({ region: configuration.region });
    }

    private async invoke(payload: any): Promise<any> {

        log.debug("Invoking lambda", {
            lambdaName: this.lambdaName,
            payload
        });

        const result = await this.lambda.invoke({
            FunctionName: this.lambdaName,
            Payload: JSON.stringify({ body: JSON.stringify(payload) })
        });

        const uintPayload = new Uint8Array(result.Payload as ArrayBuffer);

        if (result.FunctionError) {
            log.error({ result: JSON.parse(Buffer.from(uintPayload).toString("utf-8")) });
            throw new Error(result.FunctionError);
        }

        log.debug("Lambda invoked", {
            lambdaName: this.lambdaName,
            result: JSON.parse(Buffer.from(uintPayload).toString("utf-8"))
        });

        return JSON.parse(JSON.parse(Buffer.from(uintPayload).toString("utf-8")).body);
    }

    public async query(query: WorkerQuery): Promise<WorkerQueryResult> {
        return await this.invoke({
            event: "query",
            payload: [query]
        });
    }

    public async wake(wait: number): Promise<void> {
        await this.invoke({
            event: "wake",
            payload: [wait]
        });
    }

    public async saveSnapshot(): Promise<void> {
        await this.invoke({
            event: "saveSnapshot",
            payload: []
        });
    }

    public async loadLatestSnapshot(): Promise<void> {
        await this.invoke({
            event: "loadLatestSnapshot",
            payload: []
        });
    }

    public async count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        const result = await this.invoke({
            event: "count",
            payload: []
        });

        return {
            vectors: result.vectors,
            vectorDimensions: result.vectorDimensions
        };
    }

    private async lambdaRoleARN(): Promise<string> {
        const iam = new IAM({ region: this.configuration.region });

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

    public async deploy(options: {
        partition: number,
        changesTable: string,
        snapshotBucket: string,
        env: "development" | "production"
    }) {
        const lambda = new Lambda({ region: this.configuration.region });

        const result = await lambda.createFunction({
            FunctionName: this.lambdaName,
            Code: { ImageUri: "529734186765.dkr.ecr.eu-central-1.amazonaws.com/multiverse:latest" },
            Role: await this.lambdaRoleARN(),
            PackageType: "Image",
            Timeout: 900,
            MemorySize: 512,
            EphemeralStorage: { Size: 1024 },
            Environment: {
                Variables: {
                    DATABASE_CONFIG: JSON.stringify(this.configuration) as unknown,
                    PARTITION: options.partition + "" as unknown,
                    CHANGES_TABLE: options.changesTable,
                    SNAPSHOT_BUCKET: options.snapshotBucket,
                    NODE_ENV: options.env,
                } as DatabaseEnvironment & Environment["Variables"]
            }
        });

        logger.debug("Created database lambda", { result });

        await waitUntilFunctionActiveV2({
            client: lambda,
            maxWaitTime: 600,
        }, { FunctionName: result.FunctionName ?? "undefined" });
    }

    public async destroy() {
        const lambda = new Lambda({ region: this.configuration.region });

        await lambda.deleteFunction({ FunctionName: this.lambdaName });

        logger.debug("Deleted database lambda", { lambdaName: this.lambdaName });
    }
}