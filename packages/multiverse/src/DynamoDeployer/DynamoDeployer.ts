import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { DatabaseConfig, CollectionConfig } from "@multiverse/core/dist/DatabaseConfig";
import { DynamoCollection } from "@multiverse/core/dist/Collection/DynamoCollection";

const dynamo = new DynamoDB({ region: "eu-central-1" });

export default class DynamoDeployer {
    constructor(private options: {
        database: DatabaseConfig,
        collection: CollectionConfig
    }) {

    }

    public tableName() {
        return new DynamoCollection(this.options.database, this.options.collection).tableName();
    }

    public async deploy() {
        await this.createDatabaseTable();
        await this.waitUntilActive(this.tableName());
        await this.testTable(this.tableName());
    }

    public async destroy() {
        await dynamo.deleteTable({ TableName: this.tableName() });
    }

    private async createDatabaseTable() {
        await dynamo.createTable({
            TableName: this.tableName(),
            AttributeDefinitions: [
                {
                    AttributeName: "label",
                    AttributeType: "N"
                }
            ],
            KeySchema: [
                {
                    AttributeName: "label",
                    KeyType: "HASH"
                }
            ],
            BillingMode: "PAY_PER_REQUEST"
        });

        console.debug(`Dynamo ${this.tableName()} initialized`);
    }

    private async waitUntilActive(tableName: string) {
        let state = (await dynamo.describeTable({ TableName: tableName }))?.Table?.TableStatus;

        while (state !== "ACTIVE") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { Table } = await dynamo.describeTable({ TableName: tableName });
            state = Table?.TableStatus;
            console.debug(`${tableName} state: ${state}`);
        }
    }

    private async testTable(tableName: string) {
        // scan and read 0
        const scanResult = await dynamo.scan({ TableName: tableName });
        if (scanResult.Count !== 0) {
            throw new Error("Table is not empty");
        }
    }
}