import { Lambda, PackageType } from "@aws-sdk/client-lambda";
import type { DatabaseConfig, CollectionConfig } from "@multiverse/core/dist/DatabaseConfig";

const lambda = new Lambda({ region: "eu-central-1" });

export default class DatabaseDeployer {
    constructor(private options: {
        database: DatabaseConfig,
        collection: CollectionConfig
    }) {

    }

    public async deploy() {
        await this.createDatabaseLambda();

        await this.waitUntilActive(this.functionName());

        // initialize the database by invoking it
        const result = await lambda.invoke({
            FunctionName: this.functionName(),
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({
                path: "/wait",
                httpMethod: "POST",
                body: JSON.stringify({ time: 1 }),
                headers: {}
            })
        });

        if (result.StatusCode !== 200) {
            throw new Error("Database initialization failed");
        }

        console.debug(`Database ${this.options.database.databaseName} initialized`);

    }

    public async destroy() {
        await this.destroyDatabaseLambda();
    }

    public async update() {
        await this.updateDatabaseLambda();
    }

    public functionName() {
        return `multiverse-database-${this.options.database.databaseName}-${this.options.collection.collectionName}`;
    }

    private async waitUntilActive(lambdaARN: string) {
        let state = (await lambda.getFunction({ FunctionName: lambdaARN }))?.Configuration?.State;

        while (state !== "Active") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { Configuration } = await lambda.getFunction({ FunctionName: lambdaARN });
            state = Configuration?.State;
            console.debug(`${lambdaARN} state: ${state}`);
        }
    }

    private async createDatabaseLambda() {

        console.debug(`Creating function ${this.functionName()}`);
        const { FunctionArn } = await lambda.createFunction({
            FunctionName: this.functionName(),
            Role: "arn:aws:iam::529734186765:role/multiverse-database-lambda-role",
            Code: { ImageUri: "529734186765.dkr.ecr.eu-central-1.amazonaws.com/multiverse:latest" },
            PackageType: PackageType.Image,
            Timeout: 60,
            MemorySize: 512,
            Environment: {
                Variables: {
                    DATABASE_CONFIG: JSON.stringify(this.options.database),
                    COLLECTION_CONFIG: JSON.stringify(this.options.collection)
                }
            }
        });

        if (!FunctionArn) {
            throw new Error("Database creation failed");
        }

        console.debug(`Function ${this.functionName()} created`);

        return FunctionArn;
    }

    private async updateDatabaseLambda() {
        await lambda.updateFunctionCode({
            FunctionName: this.functionName(),
            ImageUri: "529734186765.dkr.ecr.eu-central-1.amazonaws.com/multiverse:latest"
        });
    }

    private async destroyDatabaseLambda() {
        await lambda.deleteFunction({ FunctionName: this.functionName() });
        console.debug(`Function ${this.functionName()} deleted`);
    }
}