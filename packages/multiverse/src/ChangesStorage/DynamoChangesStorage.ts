import { DynamoDB, } from "@aws-sdk/client-dynamodb";
import log from "@multiverse/log";
import type ChangesStorage from ".";
import {
    BatchWriteCommand, DynamoDBDocumentClient, QueryCommand
} from "@aws-sdk/lib-dynamodb";
import type { StoredVectorChange } from ".";
import { Vector } from "../Vector";

const logger = log.getSubLogger({ name: "DynamoChangesStorageDeployer" });

// TODO: optimize lazy loading?

export class DynamoChangesStorageDeployer {

    private dynamo: DynamoDB;

    constructor(private options: {
        region: string;
        tableName: string;
    }) {
        this.dynamo = new DynamoDB({ region: options.region });
    }

    public async deploy() {
        await this.createDatabaseTable();
        await this.waitUntilActive(this.options.tableName);
        await this.testTable(this.options.tableName);
    }

    public async destroy() {
        await this.dynamo.deleteTable({ TableName: this.options.tableName });

        const start = Date.now();

        // wait until table is deleted
        while (Date.now() - start < 1000 * 60) {
            try {
                await this.dynamo.describeTable({ TableName: this.options.tableName });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                logger.info(`Dynamo ${this.options.tableName} destroyed`);

                return;
            }
        }

        throw new Error(`Dynamo ${this.options.tableName} destroy timed out`);
    }

    private async createDatabaseTable() {
        logger.info(`Initializing dynamo ${this.options.tableName}`);

        await this.dynamo.createTable({
            TableName: this.options.tableName,
            KeySchema: [
                // "ownerName-dbName#partition"
                {
                    AttributeName: "PK",
                    KeyType: "HASH"
                },
                // timestamp of change
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

    private async waitUntilActive(tableName: string) {
        let state = (await this.dynamo.describeTable({ TableName: tableName }))?.Table?.TableStatus;

        while (state !== "ACTIVE") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { Table } = await this.dynamo.describeTable({ TableName: tableName });
            state = Table?.TableStatus;
            logger.debug(`${tableName} state: ${state}`);
        }
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

export default class DynamoChangesStorage implements ChangesStorage {

    private dynamo: DynamoDBDocumentClient;

    constructor(private options: {
        region: string;
        tableName: string;
        partition: number;
        indexName: string;
        owner: string;
    }) {
        const db = new DynamoDB({ region: options.region });
        this.dynamo = DynamoDBDocumentClient.from(db);
    }

    public async add(changes: StoredVectorChange[]): Promise<void> {

        const MAXIMUM_BATCH_SIZE = 25;
        // split to batches of maximum size
        if (changes.length > MAXIMUM_BATCH_SIZE) {
            const batches = [];
            for (let i = 0; i < changes.length; i += MAXIMUM_BATCH_SIZE) {
                batches.push(changes.slice(i, i + MAXIMUM_BATCH_SIZE));
            }

            for (const batch of batches) {
                await this.add(batch);
            }

            return;
        }

        await this.dynamo.send(new BatchWriteCommand({
            RequestItems: {
                [this.options.tableName]: changes.map(change => ({
                    PutRequest: {
                        Item: {
                            PK: `${this.options.owner}-${this.options.indexName}#${this.options.partition}`,
                            SK: change.timestamp,
                            // shortened to save space
                            action: change.action[0],
                            ...(change.action === "add" ? {
                                vector: change.vector.vector.toBase64(),
                                label: change.vector.label,
                                metadata: change.vector.metadata
                            } : { label: change.label })

                        },
                    }
                }))
            }
        }));

    }

    public async* changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown> {
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.dynamo.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :pk AND SK >= :sk",
                ExpressionAttributeValues: {
                    ":pk": `${this.options.owner}-${this.options.indexName}#${this.options.partition}`,
                    ":sk": timestamp
                },
                ExclusiveStartKey: lastEvaluatedKey
            }));

            for (const item of result.Items ?? []) {
                // @ts-ignore
                yield {
                    action: item.action === "a" ? "add" : "remove",
                    timestamp: item.SK,
                    ...(item.action === "a" ? {
                        vector: {
                            vector: Vector.fromBase64(item.vector),
                            label: item.label,
                            metadata: item.metadata
                        }
                    } : { label: item.label })
                };
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return;
    }

}