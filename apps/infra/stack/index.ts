// import { Stack, App } from "aws-cdk-lib";
// import * as lambda from "aws-cdk-lib/aws-lambda";
// import * as apigateway from "aws-cdk-lib/aws-apigateway";

// export class Api extends Stack {

//     private handler: lambda.Function;
//     private gateway: apigateway.RestApi;

//     constructor(scope: App, id: string) {
//         super(scope, id);

//         this.handler = new lambda.Function(this, "HorizontallyScaledLambda", {
//             runtime: lambda.Runtime.NODEJS_18_X,
//             code: lambda.Code.fromAsset("packages/database/code.zip"),
//             handler: "index.handler",
//             memorySize: 128,
//         });

//         this.gateway = new apigateway.RestApi(this, "HorizontallyScaledLambdaGateway", {
//             restApiName: "HorizontallyScaledLambdaGateway",
//             description: "Gateway for the HorizontallyScaledLambda",
//             deployOptions: { stageName: "dev" }
//         });

//         // GET /
//         this.gateway.root.addMethod("GET", new apigateway.LambdaIntegration(this.handler));
//     }

//     public getHandler(): lambda.Function {
//         return this.handler;
//     }

//     public async url(): Promise<string> {
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//         const apiGateway = await import("@aws-cdk/aws-apigateway");

//     }

// }

// const app = new App();
// export const hsl = new Api(app, "HorizontallyScaledLambda");

import HorizontallyScaledLambda from "./HSL";
import ApiGateway from "./ApiGateway";
import { App, Duration } from "aws-cdk-lib";
import type { FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import path from "path";

const app = new App();

const apiGateway = new ApiGateway(app, "MultiverseAPI");

const orchestratorProps: FunctionProps = {
    runtime: Runtime.NODEJS_18_X,
    code: Code.fromAsset(path.join(__dirname, "../../../packages/orchestrator/dist")),
    handler: "index.handler",
    memorySize: 256,
    timeout: Duration.seconds(30),
    environment: {
        REGION: "eu-central-1",
        STACK_ID: "Multiverse-Test"
    },
};

const functionProps: FunctionProps = {
    runtime: Runtime.NODEJS_18_X,
    code: Code.fromAsset(path.join(__dirname, "../../../packages/database/dist")),
    handler: "index.handler",
    memorySize: 512,
    timeout: Duration.seconds(30),
    environment: {
        REGION: "eu-central-1",
        STACK_ID: "Multiverse-Test"
    },
};

new HorizontallyScaledLambda(app, "Multiverse-Test", {
    apiGateway: apiGateway.getGateway(),
    functionProps,
    mainRegionReplicas: 3,
    orchestratorProps,
    warmInterval: 60,
    stackName: "Multiverse-Test"
});

app.synth();