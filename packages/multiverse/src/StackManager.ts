import { AwsCdkCli } from "@aws-cdk/cli-lib-alpha";
import { App, Duration } from "aws-cdk-lib";
import type { FunctionProps } from "aws-cdk-lib/aws-lambda";
import {
    Runtime, Code, Handler
} from "aws-cdk-lib/aws-lambda";
import path from "path";
import ApiGateway from "./CommonStack/ApiGateway";
import DatabaseStack from "./Database/DatabaseStack";
import CollectionsBucket from "./CommonStack/CollectionsBucket";

export function stack(_context: Record<string, any>) {
    const app = new App({ context: { region: "eu-central-1", } });

    const apiGateway = new ApiGateway(app, "MultiverseAPI");
    const collectionsBucket = new CollectionsBucket(app, "MultiverseCollectionsBucket");

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
        code: Code.fromAssetImage(path.join(__dirname, "../../../packages/database")),
        handler: Handler.FROM_IMAGE,
        memorySize: 512,
        timeout: Duration.seconds(30),
        environment: {
            REGION: "eu-central-1",
            STACK_ID: "Multiverse-Test"
        },
    };

    new DatabaseStack(app, "Multiverse-Test", {
        apiGateway: apiGateway.gateway(),
        functionProps,
        mainRegionReplicas: 3,
        orchestratorProps,
        warmInterval: 60,
        stackName: "Multiverse-Test",
        collectionsBucket: collectionsBucket.collectionsBucket(),
    });

    const directory = app.synth().directory;
    return directory;
}

export async function cli(stack: (_context: Record<string, any>) => Promise<string>) {
    return AwsCdkCli.fromCloudAssemblyDirectoryProducer({ produce: stack });
};