import type { Environment } from "@aws-sdk/client-lambda";
import {
    Architecture, Lambda, Runtime, waitUntilPublishedVersionActive
} from "@aws-sdk/client-lambda";
import type { IndexConfiguration } from "../IndexConfiguration";
import log from "@multiverse/log";
import { IAM } from "@aws-sdk/client-iam";
import type { OrchestratorEnvironment } from "./OrchestratorEnvironment";

export default class OrchestratorDeployer {

    private lambda: Lambda;

    constructor(private options: {
        indexConfiguration: IndexConfiguration;
        changesTable: string;
        snapshotBucket: string;
        infrastructureTable: string;
    }) {
        this.lambda = new Lambda({ region: options.indexConfiguration.region });
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

    public static lambdaName(indexConfiguration: IndexConfiguration) {
        return `multiverse-orchestrator-${indexConfiguration.owner}-${indexConfiguration.indexName}`;
    }

    private async lambdaRoleARN(): Promise<string> {
        // if doesn't exist, create
        const iam = new IAM({ region: this.options.indexConfiguration.region });

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

        log.debug("Created role", { result, });

        const roleARN = result.Role?.Arn;

        if (!roleARN) {
            throw new Error("Failed to create role");
        }

        return roleARN;
    }

    public async deploy(): Promise<string> {

        log.debug("Deploying orchestrator lambda function", { configuration: this.options.indexConfiguration });

        const result = await this.lambda.createFunction({
            Code: { ZipFile: await this.build(), },
            FunctionName: OrchestratorDeployer.lambdaName(this.options.indexConfiguration),
            Role: await this.lambdaRoleARN(),
            Runtime: Runtime.nodejs18x,
            Architectures: [Architecture.arm64],
            Handler: "packages/multiverse/dist/Orchestrator/Orchestrator.handler",
            Timeout: 60,
            Environment: {
                Variables: {
                    CHANGES_TABLE: this.options.changesTable,
                    INDEX_CONFIG: JSON.stringify(this.options.indexConfiguration) as any,
                    SNAPSHOT_BUCKET: this.options.snapshotBucket,
                    NODE_ENV: process.env.NODE_ENV ?? "development",
                    INFRASTRUCTURE_TABLE: this.options.infrastructureTable
                } as OrchestratorEnvironment & Environment["Variables"],
            }
        });

        log.debug("Created lambda function", { result });

        if (!result.FunctionArn) throw new Error("Failed to create lambda function");

        // wait for lambda to be created
        await waitUntilPublishedVersionActive({
            client: this.lambda,
            maxWaitTime: 60 * 1000,
        }, { FunctionName: OrchestratorDeployer.lambdaName(this.options.indexConfiguration), });

        log.debug("Lambda function is active");

        return result.FunctionArn;
    }

    public async updateCode() {
        const result = await this.lambda.updateFunctionCode({
            FunctionName: OrchestratorDeployer.lambdaName(this.options.indexConfiguration),
            ZipFile: await this.build(),
        });

        log.debug("Updated lambda function code", { result, });
    }

    public async updateConfiguration() {
        const result = await this.lambda.updateFunctionConfiguration({
            FunctionName: OrchestratorDeployer.lambdaName(this.options.indexConfiguration),
            Role: await this.lambdaRoleARN(),
            Runtime: Runtime.nodejs18x,
            Handler: "packages/multiverse/dist/Orchestrator/Orchestrator.handler",
        });

        log.debug("Updated lambda function configuration", { result, });
    }

    public async destroy() {
        // eslint-disable-next-line max-len
        const result = await this.lambda.deleteFunction({ FunctionName: OrchestratorDeployer.lambdaName(this.options.indexConfiguration), });

        log.debug("Deleted lambda function", { result, });
    }
}