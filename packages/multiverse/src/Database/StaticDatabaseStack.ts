import type { App } from "aws-cdk-lib";
import {
    Stack, Aws, Duration
} from "aws-cdk-lib";
import { PolicyStatement, AccountRootPrincipal } from "aws-cdk-lib/aws-iam";
import {
    Code, Handler, Function as LambdaFunction, Runtime
} from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import type { IBucket } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import path from "path";
import type { BaseDatabaseSettings } from "./BaseDatabaseSettings";

export type StaticDatabaseEnvironment = {
    COLLECTIONS_BUCKET: string,
    COLLECTION_NAME: string,
    PARTITION: string,
};

export type StaticOrchestratorEnvironment = {
    COLLECTIONS_BUCKET: string,
    COLLECTION_NAME: string,
    PARTITIONS: string,
};

export type StaticDatabaseSettings = BaseDatabaseSettings & {
    type: "static",
    collectionsBucket: string,
    collectionName: string,
    apiGatewayARN: string
};

export default class StaticDatabaseStack extends Stack {

    private orchestratorLambda: LambdaFunction;
    private collectionsBucket: IBucket;
    private dbLambdas: LambdaFunction[] = [];

    constructor(private readonly scope: App, private readonly id: string, private readonly props: StaticDatabaseSettings) {
        super(scope, id);

        this.orchestratorLambda = new LambdaFunction(this, "orchestrator", {
            runtime: Runtime.NODEJS_18_X,
            code: Code.fromAsset(path.join(__dirname, "../../../../packages/orchestrator/dist")),
            handler: "index.handler",
            // todo benchmark memory sizes
            memorySize: 1024,
            timeout: Duration.seconds(60),
            environment: {
                COLLECTIONS_BUCKET: props.collectionsBucket,
                COLLECTION_NAME: props.collectionName,
                PARTITIONS: "1"
            } satisfies StaticOrchestratorEnvironment,
            logRetention: RetentionDays.ONE_MONTH // this is probably enough
        });

        this.collectionsBucket = Bucket.fromBucketName(this, "collectionsBucket", props.collectionsBucket);

        // allow orchestrator lambda to access the collections bucket
        this.collectionsBucket.grantReadWrite(this.orchestratorLambda);

        // allow orchestrator to cloudformation:ListStackResources so it can get the ARNs of the lambdas
        this.orchestratorLambda.addToRolePolicy(new PolicyStatement({
            resources: [this.stackId],
            actions: ["cloudformation:ListStackResources"],
        }));

        const apiGateway = RestApi.fromRestApiAttributes(this, "apiGateway", {
            restApiId: props.apiGatewayARN.split("/")[0],
            rootResourceId: props.apiGatewayARN.split("/")[1],
        });

        for (let i = 0;i < 1;i++) {
            const lambdaFunction = this.defineDatabaseLambda(i);
            this.dbLambdas.push(lambdaFunction);
        }

        // TODO: connecting to api should be done outside of this stack
        // in order to make safe deployments
        apiGateway
            .root
            .resourceForPath("/")
            .addResource(`${id}`)
            .addMethod("ANY", new LambdaIntegration(this.orchestratorLambda));
    }

    private defineDatabaseLambda(partition: number): LambdaFunction {
        const lambdaFunction = new LambdaFunction(this, `db-lambda-${partition}`, {
            runtime: Runtime.FROM_IMAGE,
            code: Code.fromAssetImage(path.join(__dirname, "../../../../packages/database")),
            handler: Handler.FROM_IMAGE,
            // TODO: detect collection size and set memory size accordingly
            memorySize: 512,
            timeout: Duration.seconds(30),
            environment: {
                COLLECTION_NAME: this.props.collectionName,
                COLLECTIONS_BUCKET: this.props.collectionsBucket,
                PARTITION: partition.toString()
            } satisfies StaticDatabaseEnvironment,
            logRetention: RetentionDays.ONE_MONTH
        });

        // allow orchestratorLambda to invoke lambdaFunction
        this.orchestratorLambda.addToRolePolicy(new PolicyStatement({
            resources: [lambdaFunction.functionArn],
            actions: ["lambda:InvokeFunction"],
        }));

        // Restrict Lambda to be invoked from own account
        lambdaFunction.addPermission("invocationRestriction", {
            action: "lambda:InvokeFunction",
            principal: new AccountRootPrincipal(),
            sourceAccount: Aws.ACCOUNT_ID
        });

        // allow lambdaFunction to access the collections bucket
        this.collectionsBucket.grantReadWrite(lambdaFunction);

        return lambdaFunction;
    }
}