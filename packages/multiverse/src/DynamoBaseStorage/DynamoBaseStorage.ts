import {
    DynamoDB, waitUntilTableExists, waitUntilTableNotExists
} from "@aws-sdk/client-dynamodb";
import type { Region } from "../core/DatabaseConfiguration";
import log from "@multiverse/log";

const logger = log.getSubLogger({ name: "DynamoBaseStorage" });

export default class DynamoBaseStorage {

    private dynamo: DynamoDB;

    constructor(private options: {
        region: Region;
        tableName: string;
        primaryKey: string;
        sortKey?: string;
    }) {
        this.dynamo = new DynamoDB({ region: options.region });
    }

    public async deploy() {

        if (await this.exists()) {
            logger.info(`Dynamo table "${this.options.tableName}" already exists`);

            return;
        }

        await this.createDatabaseTable();
        await waitUntilTableExists({
            client: this.dynamo,
            maxWaitTime: 60
        }, { TableName: this.options.tableName });
        await this.testTable(this.options.tableName);

        logger.info(`Dynamo "${this.options.tableName}" deployed`);
    }

    public async destroy() {
        await this.dynamo.deleteTable({ TableName: this.options.tableName });
        await waitUntilTableNotExists({
            client: this.dynamo,
            maxWaitTime: 60
        }, { TableName: this.options.tableName });

        logger.info(`Dynamo "${this.options.tableName}" destroyed`);
    }

    public async exists() {
        try {
            await this.dynamo.describeTable({ TableName: this.options.tableName });

            return true;
        } catch (e: any) {
            if (e.name === "ResourceNotFoundException") {
                return false;
            }
            throw e;
        }
    }

    private async createDatabaseTable() {
        logger.info(`Initializing dynamo ${this.options.tableName}`);

        await this.dynamo.createTable({
            TableName: this.options.tableName,
            KeySchema: [
                {
                    AttributeName: "PK",
                    KeyType: "HASH"
                },
                {
                    AttributeName: "SK",
                    KeyType: "RANGE"
                },
            ],
            AttributeDefinitions: [
                {
                    AttributeName: "PK",
                    AttributeType: "S"
                },
                {
                    AttributeName: "SK",
                    AttributeType: "N"
                },
            ],
            BillingMode: "PAY_PER_REQUEST",
        });

        logger.info(`Dynamo ${this.options.tableName} initialized`);
    }

    private async testTable(tableName: string) {
        // scan and read 0
        const scanResult = await this.dynamo.scan({
            TableName: tableName,
            Limit: 1
        });
        if (scanResult.Count !== 0) {
            throw new Error("Table is not empty");
        }
    }

}