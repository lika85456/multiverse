import HorizontallyScaledLambda from "./HSL";
import ApiGateway from "./ApiGateway";
import { App, Duration } from "aws-cdk-lib";
import type { FunctionProps } from "aws-cdk-lib/aws-lambda";
import {
    Runtime, Code, Handler
} from "aws-cdk-lib/aws-lambda";
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
    runtime: Runtime.FROM_IMAGE,
    // code: Code.fromAsset(path.join(__dirname, "../../../packages/database/dist")),
    code: Code.fromAssetImage(path.join(__dirname, "../../../packages/database")),
    handler: Handler.FROM_IMAGE,
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