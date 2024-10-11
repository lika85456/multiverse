import {
    DynamoDB, waitUntilTableExists, waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";
import log from "@multiverse/log";
import type ChangesStorage from ".";
import {
    BatchWriteCommand, DynamoDBDocumentClient, QueryCommand
} from "@aws-sdk/lib-dynamodb";
import type { StoredVectorChange } from "./StoredVector";
import type { DatabaseID } from "../core/DatabaseConfiguration";
import type { AwsToken } from "../core/AwsToken";

const logger = log.getSubLogger({ name: "DynamoChangesStorageDeployer" });

// TODO: optimize lazy loading?

// export const storedVectorChangeSchema = z.union([
//     z.object({
//         action: z.literal("add"),
//         timestamp: z.number(),
//         vector: newVectorSchema,
//     }),
//     z.object({
//         action: z.literal("remove"),
//         timestamp: z.number(),
//         label: z.string(),
//     }),
// ]);

export class DynamoChangesStorageDeployer {

    private dynamo: DynamoDB;

    constructor(private options: {
        region: string;
        tableName: string;
        awsToken: AwsToken
    }) {
        this.dynamo = new DynamoDB({
            region: options.region,
            credentials: options.awsToken
        });
    }

    public async deploy() {

        if (await this.exists()) {
            logger.info(`Dynamo ${this.options.tableName} already exists`);

            return;
        }

        await this.createDatabaseTable();
        // await this.waitUntilActive(this.options.tableName);
        await waitUntilTableExists({
            client: this.dynamo,
            maxWaitTime: 60
        }, { TableName: this.options.tableName });
        await this.testTable(this.options.tableName);

        logger.info(`Dynamo ${this.options.tableName} deployed`);
    }

    public async destroy() {
        await this.dynamo.deleteTable({ TableName: this.options.tableName });
        await waitUntilTableNotExists({
            client: this.dynamo,
            maxWaitTime: 60
        }, { TableName: this.options.tableName });

        logger.info(`Dynamo ${this.options.tableName} destroyed`);
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
                // "ownerName-dbName"
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
            // BillingMode: "PROVISIONED",
            // ProvisionedThroughput: {
            //     ReadCapacityUnits: 25,
            //     WriteCapacityUnits: 25
            // },
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

export default class DynamoChangesStorage implements ChangesStorage {

    private deployer: DynamoChangesStorageDeployer;

    private dynamo: DynamoDBDocumentClient;
    private TTL = 60 * 60 * 24 * 2; // 2 days

    constructor(private options: {
        databaseId: DatabaseID;
        tableName: string;
        awsToken: AwsToken;
    }) {
        const db = new DynamoDB({
            region: options.databaseId.region,
            credentials: options.awsToken
        });
        this.dynamo = DynamoDBDocumentClient.from(db);
        this.deployer = new DynamoChangesStorageDeployer({
            region: this.options.databaseId.region,
            tableName: this.options.tableName,
            awsToken: options.awsToken
        });
    }

    public async add(changes: StoredVectorChange[], batchIndexOffset = 0): Promise<void> {

        if (changes.length > 1000) {
            throw new Error("Maximum 1000 changes can be added at once");
        }

        logger.debug("Adding changes to dynamo", changes);

        const MAXIMUM_BATCH_SIZE = 25;
        // split to batches of maximum size
        if (changes.length > MAXIMUM_BATCH_SIZE) {
            const batches = [];
            for (let i = 0; i < changes.length; i += MAXIMUM_BATCH_SIZE) {
                batches.push(changes.slice(i, i + MAXIMUM_BATCH_SIZE));
            }

            // for (const batch of batches) {
            for (let i = 0; i < batches.length; i++) {
                await this.add(batches[i], i * MAXIMUM_BATCH_SIZE);
            }

            return;
        }

        const result = await this.dynamo.send(new BatchWriteCommand({
            RequestItems: {
                [this.options.tableName]: changes.map((change, index) => ({
                    PutRequest: {
                        Item: {
                            PK: `${this.options.databaseId.name}`,
                            SK: change.timestamp * 1000 + index + batchIndexOffset,
                            // shortened to save space
                            action: change.action[0],

                            ...(change.action === "add" ? {
                                // vector: new Vector(change.vector.vector).toBase64(),
                                vector: change.vector.vector,
                                label: change.vector.label,
                                ...(change.vector.metadata ? { metadata: change.vector.metadata } : {})
                            } : { label: change.label }),
                            ttl: Math.floor(Date.now() / 1000) + this.TTL
                        },
                    }
                }))
            },
            ReturnConsumedCapacity: "TOTAL",
        }));

        if (result.UnprocessedItems && result.UnprocessedItems[this.options.tableName]) {
            throw new Error("Unprocessed items");
        }

        logger.debug("Batch write result consumed capacity: " + result.ConsumedCapacity?.map(c => c.CapacityUnits).join(", "));
    }

    public async* changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown> {
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.dynamo.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :pk AND SK >= :sk",
                ExpressionAttributeValues: {
                    ":pk": this.options.databaseId.name,
                    ":sk": timestamp * 1000
                },
                ExclusiveStartKey: lastEvaluatedKey,
                ScanIndexForward: true
            }));

            for (const item of result.Items ?? []) {
                // @ts-ignore
                yield {
                    action: item.action === "a" ? "add" : "remove",
                    timestamp: Math.floor(item.SK / 1000), // flooring is required because of the index floating point
                    ...(item.action === "a" ? {
                        vector: {
                            // vector: Vector.fromBase64(item.vector).toArray(),
                            vector: item.vector,
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

    public async count(): Promise<number> {
        const result = await this.dynamo.send(new QueryCommand({
            TableName: this.options.tableName,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": this.options.databaseId.name },
            Select: "COUNT"
        }));

        return result.Count ?? 0;
    }

    /**
     * removes all changes before the given timestamp
     * @param timestamp
     */
    public async clearBefore(timestamp: number): Promise<void> {
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.dynamo.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :pk AND SK < :sk",
                ExpressionAttributeValues: {
                    ":pk": this.options.databaseId.name,
                    ":sk": timestamp * 1000
                },
                ExclusiveStartKey: lastEvaluatedKey,
                ScanIndexForward: true
            }));

            const keys = result.Items?.map(item => ({
                PK: item.PK,
                SK: item.SK
            }));

            if (keys) {
                // split by batches of 25
                for (let i = 0; i < keys.length; i += 25) {
                    // eslint-disable-next-line max-len
                    await this.dynamo.send(new BatchWriteCommand({ RequestItems: { [this.options.tableName]: keys.slice(i, i + 25).map(key => ({ DeleteRequest: { Key: key } })) } }));
                }
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
    }

    public async getAllChangesAfter(timestamp: number): Promise<StoredVectorChange[]> {
        const changes = [];
        for await (const change of this.changesAfter(timestamp)) {
            changes.push(change);
        }

        return changes;
    }

    public async deploy() {
        if (!await this.deployer.exists()) {
            logger.info("Deploying dynamo changes storage");
            await this.deployer.deploy();
            logger.info("Dynamo changes storage deployed");
        } else {
            logger.info("Dynamo changes storage already exists");
        }
    }

    public async destroy() {
        logger.info("Destroying dynamo changes storage");
        await this.deployer.destroy();
        logger.info("Dynamo changes storage destroyed");
    }

    public getResourceName(): string {
        return this.options.tableName;
    }
}