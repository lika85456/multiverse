import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";

export class CdkStarterStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const table = new dynamodb.Table(this, "test-table", {
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const api = new apigateway.RestApi(this, "api", {
            description: "dynamo benchmark api gateway",
            deployOptions: { stageName: "dev", },
            // 👇 enable CORS
            defaultCorsPreflightOptions: {
                allowHeaders: [
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                ],
                allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
                allowCredentials: true,
                allowOrigins: ["http://localhost:3000"],
            },
        });

        // 👇 create an Output for the API URL
        new cdk.CfnOutput(this, "apiUrl", { value: api.url });

        // 👇 define delete todo function
        const testLambda = new lambda.Function(this, "test-lambda", {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: "runtime.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "dist")),
            timeout: cdk.Duration.seconds(30),
            memorySize: 1024,
            environment: { TABLE_NAME: table.tableName, }
        });

        const test = api.root.addResource("test");

        // 👇 integrate GET /todos with getTodosLambda
        test.addMethod(
            "GET",
            new apigateway.LambdaIntegration(testLambda)
        );

        test.addMethod(
            "POST",
            new apigateway.LambdaIntegration(testLambda)
        );

        // 👇 grant the lambda role read/write permissions to the table
        table.grantFullAccess(testLambda);
    }
}