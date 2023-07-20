import { App, RemovalPolicy } from "aws-cdk-lib";
import type DatabaseStorage from "../DatabaseStorage/DatabaseStorage";
import { Bucket } from "aws-cdk-lib/aws-s3";
import StaticDatabaseStack from "../Database/StaticDatabaseStack";
import { AwsCdkCli } from "@aws-cdk/cli-lib-alpha";
import CollectionsBucket from "../CommonStack/CollectionsBucket";

export default class Workspace {
    constructor(
        public readonly name: string,
        public readonly region: string,
        public readonly apiGatewayARN: string,
        private readonly storage: DatabaseStorage
    ) {

    }

    // stack to be used in cli
    public async deploy() {
        await this.cli().deploy({ verbose: true });
    }

    public async destroy() {
        await this.cli().destroy();
    }

    private cli() {
        return AwsCdkCli.fromCloudAssemblyDirectoryProducer({ produce: (context) => this.stack(context) });
    }

    private async stack(context: Record<string, any>) {
        const app = new App({
            context: {
                region: this.region,
                ...context
            }
        });

        const collectionsBucket = new CollectionsBucket(app, "collectionsBucket").collectionsBucket();

        const _dbs = (await this.storage.getDatabases(this.name)).map(db => {
            if (db.type === "static") {
                return new StaticDatabaseStack(app, db.name, {
                    apiGatewayARN: this.apiGatewayARN,
                    collectionName: db.collectionName,
                    collectionsBucket: collectionsBucket.bucketName,
                    ephemeralStorageSize: db.ephemeralStorageSize,
                    memorySize: db.memorySize,
                    name: db.name,
                    region: this.region,
                    type: "static"
                });
            }

            // TODO implement dynamic databases

            throw new Error(`Unknown database type: ${db.type}`);
        });

        return app.synth().directory;
    }
}