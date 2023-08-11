import type {
    DynamicCollection, StoredVector, LabeledVector
} from "./Collection";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, QueryCommand, GetCommand, DeleteCommand, TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import type { DatabaseConfig } from "../DatabaseConfig";
import { ENV } from "../env";

const { COLLECTIONS_TABLE } = ENV;

// | PrimaryKey     |                                |                 |              |          |             |           |
// | -------------- | ------------------------------ | --------------- | ------------ | -------- | ----------- | --------- |
// | PK - Partition | SK                             |                 |              |          |             |           |
// | USER#          | STAT#my-database               | activeVectors   | totalVectors |          |             |           |
// |                |                                | 2               | 3            |          |             |           |
// |                |                                | vector (base64) | label        | updated  | deactivated | pid       |
// |                | V#my-database#2505c14d25ba5b07 | [1,2,3]         | My text      | 80846484 |             | 0.9819884 |
// |                | V#my-database#7c740b1da30d969a | [4,5,6]         | My test      | 80846485 | true        | 0.2135415 |
// |                | V#my-database#dafaf99efe354835 | [6,7,8]         | My car       | 80846485 |             | 0.0518498 |
// |                |                                |                 |              |          |             |           |
// |                |                                |                 |              |          |             |           |

export class DynamoCollection implements DynamicCollection {

    private client: DynamoDBClient;
    private docClient: DynamoDBDocumentClient;

    constructor(private databaseConfig: DatabaseConfig) {
        this.client = new DynamoDBClient({ region: this.databaseConfig.mainRegion });
        this.docClient = DynamoDBDocumentClient.from(this.client);
    }

    databaseName(): string {
        return this.databaseConfig.databaseName;
    }

    user(): string {
        return this.databaseConfig.owner;
    }

    public async dimensions(): Promise<number> {
        return this.databaseConfig.dimensions;
    }

    public async size(): Promise<number> {
        const { owner, databaseName } = this.databaseConfig;

        const result = await this.docClient.send(new GetCommand({
            TableName: COLLECTIONS_TABLE,
            Key: {
                PK: `USER#${owner}`,
                SK: `STAT#${databaseName}`
            }
        }));

        return result.Item?.totalVectors ?? 0;
    }

    private encodeVector(vector: number[]): string {
        return Buffer.from(vector).toString("base64");
    }

    private decodeVector(encoded: string): number[] {
        return Array.from(Buffer.from(encoded, "base64"));
    }

    private encodeNumber(number: number): string {
        return Buffer.from(number.toString()).toString("base64");
    }

    private decodeNumber(encoded: string): number {
        return Number(Buffer.from(encoded, "base64").toString());
    }

    public async get(uid: number): Promise<StoredVector | undefined> {
        const { owner, databaseName } = this.databaseConfig;

        const result = await this.docClient.send(new GetCommand({
            TableName: COLLECTIONS_TABLE,
            Key: {
                PK: `USER#${owner}`,
                SK: `V#${databaseName}#${this.encodeNumber(uid)}`
            }
        }));

        const {
            label, vector, updated, deactivated, pid
        } = result.Item ?? {};

        if (!deactivated && vector) {
            return {
                label,
                vector: this.decodeVector(vector),
                updated,
                deactivated,
                uid,
                pid
            };
        }

        return undefined;
    }

    public async add(vectors: LabeledVector[], timestamp = Date.now()): Promise<void> {
        console.debug(`Adding ${vectors.length} vectors to ${COLLECTIONS_TABLE}`);

        const { owner, databaseName } = this.databaseConfig;

        const vectorsToAdd = vectors.map(({
            label, vector, uid
        }) => ({
            PK: `USER#${owner}`,
            SK: `V#${databaseName}#${this.encodeNumber(uid)}`,
            label,
            vector: this.encodeVector(vector),
            updated: timestamp,
            pid: Math.random()
        }));

        const items = vectorsToAdd.map(vector => ({ PutRequest: { Item: vector } }));

        // limit is 100 per batch, so Put 99 and Update stats
        const batches: any[][] = [];

        while (items.length > 0) {
            // vectors
            const batch: any[] = items.splice(0, 99);

            // stats
            batch.push({
                UpdateRequest: {
                    Key: {
                        PK: `USER#${owner}`,
                        SK: `STAT#${databaseName}`
                    },
                    UpdateExpression: "SET totalVectors = totalVectors + :addedVectors",
                    ExpressionAttributeValues: { ":addedVectors": batch.length }
                }
            });

            batches.push(batch);
        }

        await Promise.all(batches.map(batch => this.docClient.send(new TransactWriteCommand({ TransactItems: batch }))));
    }

    public async remove(uids: number[]): Promise<void> {
        console.debug(`Deactivating ${uids.length} vectors from ${COLLECTIONS_TABLE}`);

        const { owner, databaseName } = this.databaseConfig;

        const items = uids.map(uid => ({
            UpdateRequest: {
                Key: {
                    PK: `USER#${owner}`,
                    SK: `V#${databaseName}#${this.encodeNumber(uid)}`,
                },
                UpdateExpression: "SET deactivated = :deactivated",
                ExpressionAttributeValues: { ":deactivated": true }
            }
        }));

        const batches: any[][] = [];

        while (items.length > 0) {
            // vectors
            const batch: any[] = items.splice(0, 99);

            // stats
            batch.push({
                UpdateRequest: {
                    Key: {
                        PK: `USER#${owner}`,
                        SK: `STAT#${databaseName}`
                    },
                    // keep the amount of totalVectors but subtract the amount of deactivated vectors
                    UpdateExpression: "SET activeVectors = activeVectors - :deactivatedVectors",
                    ExpressionAttributeValues: { ":deactivatedVectors": batch.length }
                }
            });

            batches.push(batch);
        }

        await Promise.all(batches.map(batch => this.docClient.send(new TransactWriteCommand({ TransactItems: batch }))));
    }

    public async cleanupRemoved(olderThan: number) {
        const { owner, databaseName } = this.databaseConfig;

        const result = await this.docClient.send(new GetCommand({
            TableName: COLLECTIONS_TABLE,
            Key: {
                PK: `USER#${owner}`,
                SK: `STAT#${databaseName}`
            },
            ProjectionExpression: "totalVectors, activeVectors"
        }));

        const { totalVectors, activeVectors } = result.Item ?? {};

        if (totalVectors && activeVectors && totalVectors > activeVectors) {
            console.debug(`Cleaning up ${totalVectors - activeVectors} deactivated vectors from ${COLLECTIONS_TABLE}`);

            const result = await this.docClient.send(new QueryCommand({
                TableName: COLLECTIONS_TABLE,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                FilterExpression: "deactivated AND #updated < :olderThan",
                ExpressionAttributeValues: {
                    ":pk": `USER#${owner}`,
                    ":sk": `V#${databaseName}`,
                    ":olderThan": olderThan
                },
                ProjectionExpression: "SK"
            }));

            const ids: number[] = result.Items?.map(item => this.decodeNumber(item.SK.split("#")[2])) ?? [];

            await this.remove(ids);
        }
    }

    public async* next(partitionIndex: number, totalPartitions: number): AsyncGenerator<StoredVector, void, unknown> {
        const { owner, databaseName } = this.databaseConfig;

        // map partitionIndex to a random number between 0 and 1
        const start = partitionIndex / totalPartitions;
        const end = (partitionIndex + 1) / totalPartitions;

        // paginate through the collection
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.docClient.send(new QueryCommand({
                TableName: COLLECTIONS_TABLE,
                KeyConditionExpression: "#PK = :pk AND begins_with(#SK,:sk)",
                FilterExpression: "#pid>=:start AND #pid<:end AND NOT #deactivated",
                ExpressionAttributeValues: {
                    ":pk": `USER#${owner}`,
                    ":sk": `V#${databaseName}`,
                    ":start": start,
                    ":end": end
                },
                ExpressionAttributeNames: {
                    "#PK": "PK",
                    "#SK": "SK",
                    "#pid": "pid",
                    "#deactivated": "deactivated"
                },
                ProjectionExpression: "label, vector, updated, pid, SK",
                Limit: 100,
                ExclusiveStartKey: lastEvaluatedKey
            }));

            const { Items, LastEvaluatedKey } = result;

            lastEvaluatedKey = LastEvaluatedKey;

            if (Items) {
                for (const vector of Items) {
                    yield {
                        label: vector.label,
                        vector: this.decodeVector(vector.vector),
                        updated: vector.updated,
                        pid: vector.pid,
                        uid: this.decodeNumber(vector.SK.split("#")[2]),
                    };
                }
            }
        }
        while (lastEvaluatedKey);
    }

    public async* nextChangeAfter(
        timestamp: number,
        partitionIndex: number,
        totalPartitions: number
    ): AsyncGenerator<StoredVector, void, unknown> {
        const { owner, databaseName } = this.databaseConfig;

        // map partitionIndex to a random number between 0 and 1
        const start = partitionIndex / totalPartitions;
        const end = (partitionIndex + 1) / totalPartitions;

        // paginate through the collection
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.docClient.send(new QueryCommand({
                TableName: COLLECTIONS_TABLE,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                FilterExpression: "NOT deactivated AND updated > :timestamp AND (pid BETWEEN :start AND :end)",
                ExpressionAttributeValues: {
                    ":pk": `USER#${owner}`,
                    ":sk": `V#${databaseName}`,
                    ":timestamp": timestamp,
                    ":start": start,
                    ":end": end
                },
                ProjectionExpression: "label, vector, updated, pid, SK",
                Limit: 100,
                ExclusiveStartKey: lastEvaluatedKey
            }));

            const { Items, LastEvaluatedKey } = result;

            lastEvaluatedKey = LastEvaluatedKey;

            if (Items) {
                for (const vector of Items) {
                    yield {
                        label: vector.label,
                        vector: this.decodeVector(vector.vector),
                        updated: vector.updated,
                        pid: vector.pid,
                        uid: this.decodeNumber(vector.SK.split("#")[2]),
                    };
                }
            }
        }
        while (lastEvaluatedKey);
    }

    // remove everything from the collection
    public async deleteAll() {
        const { owner, databaseName } = this.databaseConfig;

        // bulk delete every row in the collection with the given PK and SK
        // using batchWrite and DeleteRequest, limit is 25 per batch
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.docClient.send(new QueryCommand({
                TableName: COLLECTIONS_TABLE,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: {
                    ":pk": `USER#${owner}`,
                    ":sk": `V#${databaseName}`
                },
                ProjectionExpression: "SK",
                Limit: 25,
                ExclusiveStartKey: lastEvaluatedKey
            }));

            const { Items, LastEvaluatedKey } = result;

            lastEvaluatedKey = LastEvaluatedKey;

            if (Items) {
                const ids = Items.map(item => this.decodeNumber(item.SK.split("#")[2]));

                await this.remove(ids);
            }
        }
        while (lastEvaluatedKey);

        // delete the stats row
        await this.docClient.send(new DeleteCommand({
            TableName: COLLECTIONS_TABLE,
            Key: {
                PK: `USER#${owner}`,
                SK: `STAT#${databaseName}`
            },
        }));
    }
}