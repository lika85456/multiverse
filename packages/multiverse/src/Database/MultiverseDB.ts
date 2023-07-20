// Databases
// + createStatic({
//     name,
//     region,
//     collection: Collection,
// })
// + createDynamic({
//     name,
//     region,
//     dimensions,
//     estimatedSize
// })
// + delete(name)
// + database(name): Database | undefined

// StaticDatabase
// + knn(vector, k)
// + name()
// + collection()

// DynamicDatabase
// + knn(vector, k)
// + add(vector, label)
// + remove(label)
// + vector(label)
// + count()
// + name()
// + dimensions()
// + estimatedSize()

import type { Bucket } from "aws-cdk-lib/aws-s3";
import type { Collection } from "../Collections/Collection";
import type * as apigateway from "aws-cdk-lib/aws-apigateway";
import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { cli } from "../StackManager";
import { App, Duration } from "aws-cdk-lib";
import type { FunctionProps } from "aws-cdk-lib/aws-lambda";
import {
    Runtime, Code, Handler
} from "aws-cdk-lib/aws-lambda";
import path from "path";
import DatabaseStack from "./DatabaseStack";

type DatabaseDeployOptions = {
    name: string;
    region: string;
    collection: Collection;
    fallbackRegions?: string[];
    fallbackConcurrency?: number;
    apiGateway: apigateway.RestApi;
    collectionsBucket: Bucket;
};

export class Databases {

    constructor(private options: {
        apiGateway: apigateway.RestApi;
        collectionsBucket: Bucket;
        region: string;
    }) {

    }

    private async getCli({
        name, region, collection, fallbackConcurrency
    }: DatabaseDeployOptions) {
        return await cli(async(context) => {
            const app = new App(context);

            const orchestratorProps: FunctionProps = {
                runtime: Runtime.NODEJS_18_X,
                code: Code.fromAsset(path.join(__dirname, "../../../packages/orchestrator/dist")),
                handler: "index.handler",
                memorySize: 256,
                timeout: Duration.seconds(30),
                environment: {
                    REGION: region,
                    STACK_ID: name,
                    COLLECTION_NAME: collection.name()
                },
            };

            const functionProps: FunctionProps = {
                runtime: Runtime.FROM_IMAGE,
                code: Code.fromAssetImage(path.join(__dirname, "../../../packages/database")),
                handler: Handler.FROM_IMAGE,
                memorySize: 512,
                timeout: Duration.seconds(30),
                environment: {
                    REGION: region,
                    STACK_ID: name
                },
            };

            new DatabaseStack(app, name, {
                apiGateway: this.options.apiGateway,
                functionProps,
                mainRegionReplicas: fallbackConcurrency ?? 1,
                orchestratorProps,
                warmInterval: 60,
                stackName: name,
                collectionsBucket: this.options.collectionsBucket,
            });

            return app.synth().directory;
        });
    }

    public async createStatic(deployOptions: {
        name: string;
        collection: Collection;
        fallbackRegions?: string[];
        fallbackConcurrency?: number;
    }) {
        const database = new Database({
            ...deployOptions,
            apiGateway: this.options.apiGateway,
            collectionsBucket: this.options.collectionsBucket,
            region: this.options.region
        });

        if (await this.databaseExists(deployOptions.name)) {
            throw new Error(`Database ${deployOptions.name} already exists`);
        }

        await (await this.getCli({
            ...deployOptions,
            region: this.options.region,
            apiGateway: this.options.apiGateway,
            collectionsBucket: this.options.collectionsBucket,
        })).deploy();

        return database;
    }

    public async destroy(database: Database) {
        await (await this.getCli(database.deployOptions)).destroy();
    }

    public async databaseExists(name: string) {
        const cloudformation = new CloudFormation({ region: this.options.region });
        const result = await cloudformation.describeStacks({ StackName: name });
        return result.Stacks && result.Stacks.length > 0;
    }
}

export class Database {
    constructor(public deployOptions: DatabaseDeployOptions) {

    }

}

export class StaticDatabase extends Database {

    public async knn(queryVector: number[], k: number) {

    }

    public async name() {

    }

    public async collection() {

    }
}