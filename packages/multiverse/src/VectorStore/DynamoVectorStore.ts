import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, GetCommand, UpdateCommand, TransactWriteCommand, QueryCommand, BatchGetCommand
} from "@aws-sdk/lib-dynamodb";
import { Vector } from "../Database/Vector";
import type { StoredVector } from "../Database/Vector";
import type { Partition } from "../Database/VectorDatabase";
import type VectorStore from "./VectorStore";

// |                     |               |              |            |                  |          |                |         |             |
// | ------------------- | ------------- | ------------ | ---------- | ---------------- | -------- | -------------- | ------- | ----------- |
// | PK        |               |              |            | SortKey          |          |                |         |             |
// |                     | activeVectors | totalVectors | partitions |                  |          |                |         |             |
// | lika85456-mydb#STAT | 2             | 3            | 1          |                  |          |                |         |             |
// |                     |               |              |            | id               | label    | vector(base64) | updated | deactivated |
// | lika85456-mydb#0    |               |              |            | 2505c14d25ba5b07 | My Text  | [1,2,3]        | 0       |             |
// | lika85456-mydb#0    |               |              |            | 7c740b1da30d969a | My Car   | [4,5,6]        | 2       | TRUE        |
// | lika85456-mydb#0    |               |              |            | dafaf99efe354835 | Your Mom | [7,8,9]        | 5       |             |
// |                     |               |              |            |                  |          |                |         |             |

type Stats = {
    activeVectors: number;
    totalVectors: number;
    partitions: number;
};

export default class DynamoVectorStore implements VectorStore {

    private client: DynamoDBClient;
    private docClient: DynamoDBDocumentClient;

    constructor(private options: {
        databaseName: string
        tableName: string,
        region: string,
        dimensions: number,
    }) {
        this.client = new DynamoDBClient({ region: this.options.region });
        this.docClient = DynamoDBDocumentClient.from(this.client);
    }

    private async getStats(): Promise<Stats> {
        const result = await this.docClient.send(new GetCommand({
            TableName: this.options.tableName,
            Key: {
                PK: `${this.options.databaseName}#STAT`,
                id: 0
            }
        }));

        if (!result.Item) {
            return {
                activeVectors: 0,
                totalVectors: 0,
                partitions: 1,
            };
        }

        return {
            activeVectors: result.Item.activeVectors,
            totalVectors: result.Item.totalVectors,
            partitions: result.Item.partitions ?? 1
        };
    }

    private async setStats(stats: Stats) {
        await this.docClient.send(new UpdateCommand({
            TableName: this.options.tableName,
            Key: { PK: `${this.options.databaseName}#STAT`, },
            UpdateExpression: "SET activeVectors = :activeVectors, totalVectors = :totalVectors, partitions = :partitions",
            ExpressionAttributeValues: {
                ":activeVectors": stats.activeVectors,
                ":totalVectors": stats.totalVectors,
                ":partitions": stats.partitions,
            }
        }));
    }

    public async add(vectors: StoredVector[], retry = 0): Promise<void> {

        if (vectors.length === 0) {
            return;
        }

        if (vectors.length > 99) {
            await Promise.all(Array.from({ length: Math.ceil(vectors.length / 99) }, (_, i) => i).map(async(i) => {
                await this.add(vectors.slice(i * 99, (i + 1) * 99));
            }));
        }

        if (vectors.some(v => v.vector.toArray().length !== this.options.dimensions)) {
            throw new Error("Invalid vector dimensions in one or more vectors");
        }

        const { partitions } = await this.getStats();

        const vectorsToAdd = vectors.map((vector) => ({
            PK: `${this.options.databaseName}#${partitions - 1}`,
            id: vector.id,
            label: vector.label,
            vector: vector.vector.toArray(),
            lastUpdate: vector.lastUpdate,
        }));

        try {
            await this.docClient.send(new TransactWriteCommand({
                TransactItems: [
                    ...vectorsToAdd.map(vector => ({
                        Put: {
                            TableName: this.options.tableName,
                            Item: vector,
                        },
                    })),
                    {
                        Update: {
                            TableName: this.options.tableName,
                            Key: {
                                PK: `${this.options.databaseName}#STAT`,
                                id: 0
                            },
                            UpdateExpression: "ADD totalVectors :addedVectors, activeVectors :addedVectors",
                            ExpressionAttributeValues: { ":addedVectors": vectorsToAdd.length, }
                        }
                    }
                ]
            }));
        }
        catch (e: unknown | any) {
            if (e.name === "TransactionCanceledException") {

                if (retry > 3) {
                    throw e;
                }

                // try again in case of throttling after 1 second
                await new Promise(resolve => setTimeout(resolve, (retry + 1) * 1000));
                await this.add(vectors, retry + 1);
            }
        }
    }

    public async remove(ids: number[]): Promise<void> {
        // mark as deactivated

        if (ids.length === 0) {
            return Promise.resolve();
        }

        if (ids.length > 99) {
            await Promise.all(Array.from({ length: Math.ceil(ids.length / 99) }, (_, i) => i).map(async(i) => {
                await this.remove(ids.slice(i * 99, (i + 1) * 99));
            }));
        }

        // get all vectors in batch
        const { partitions } = await this.getStats();

        const vectorsToRemove:(StoredVector & {
            PK: string;
        })[] = [];

        await Promise.all(Array.from({ length: partitions }, (_, i) => i).map(async(partition) => {
            const result = await this.docClient.send(new BatchGetCommand({
                RequestItems: {
                    [this.options.tableName]: {
                        Keys: ids.map(id => ({
                            PK: `${this.options.databaseName}#${partition}`,
                            id
                        }))
                    }
                }
            }));

            if (result.Responses) {
                vectorsToRemove.push(...result.Responses[this.options.tableName] as any);
            }
        }));

        // use transaction to remove vectors and update stats in batch
        const batches = Math.ceil(vectorsToRemove.length / 99);

        for (let i = 0; i < batches; i++) {
            const batch = vectorsToRemove.slice(i * 99, (i + 1) * 99);

            await this.docClient.send(new TransactWriteCommand({
                TransactItems: [
                    ...batch.map(vector => ({
                        Update: {
                            TableName: this.options.tableName,
                            Key: {
                                PK: vector.PK,
                                id: vector.id,
                            },
                            UpdateExpression: "SET deactivated = :deactivated",
                            ExpressionAttributeValues: { ":deactivated": 1, }
                        }
                    })),
                    {
                        Update: {
                            TableName: this.options.tableName,
                            Key: {
                                PK: `${this.options.databaseName}#STAT`,
                                id: 0
                            },
                            UpdateExpression: "ADD activeVectors :addedVectors",
                            ExpressionAttributeValues: { ":addedVectors": -batch.length, }
                        }
                    }
                ]
            }));
        }
    }

    public async cleanupBefore(timestamp: number): Promise<void> {
        // remove deactivated vectors older than timestamp

        const { partitions } = await this.getStats();

        const vectorsToRemove: {id: number, PK: string, deactivated: 1}[] = [];

        for (let i = 0; i < partitions; i++) {

            let lastEvaluatedKey: any = undefined;

            do {
                const result = await this.docClient.send(new QueryCommand({
                    TableName: this.options.tableName,
                    KeyConditionExpression: "PK = :partitionKey AND deactivated = :deactivated",
                    FilterExpression: "lastUpdate < :lastUpdate",
                    ExpressionAttributeValues: {
                        ":partitionKey": `${this.options.databaseName}#${i}`,
                        ":deactivated": 1,
                        ":lastUpdate": timestamp,
                    },
                    IndexName: "PK-deactivated-index",
                    ProjectionExpression: "id",
                    ExclusiveStartKey: lastEvaluatedKey,
                }));

                if (result.Items) {
                    vectorsToRemove.push(...result.Items as any);
                }

                lastEvaluatedKey = result.LastEvaluatedKey;
            } while (lastEvaluatedKey);
        }

        // use transaction to remove vectors and update stats in batch
        const batches = Math.ceil(vectorsToRemove.length / 99);

        await Promise.all(Array.from({ length: batches }, (_, i) => i).map(async(i) => {
            const batch = vectorsToRemove.slice(i * 99, (i + 1) * 99);

            await this.docClient.send(new TransactWriteCommand({
                TransactItems: [
                    ...batch.map(vector => ({
                        Delete: {
                            TableName: this.options.tableName,
                            Key: {
                                PK: vector.PK,
                                id: vector.id,
                            }
                        }
                    })),
                    {
                        Update: {
                            TableName: this.options.tableName,
                            Key: {
                                PK: `${this.options.databaseName}#STAT`,
                                id: 0
                            },
                            UpdateExpression: "ADD activeVectors :addedVectors",
                            ExpressionAttributeValues: { ":addedVectors": -batch.length, }
                        }
                    }
                ]
            }));
        }));
    }

    public async getByLabel(label: string): Promise<StoredVector | undefined> {
        const { partitions } = await this.getStats();

        for (let i = 0; i < partitions; i++) {
            const result = await this.docClient.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :partitionKey AND label = :label",
                ExpressionAttributeValues: {
                    ":partitionKey": `${this.options.databaseName}#${i}`,
                    ":label": label,
                },
                IndexName: "PK-label-index",
                Limit: 1
            }));

            if (result.Items && result.Items.length > 0) {
                const item = result.Items[0];
                return {
                    id: item.id,
                    label: item.label,
                    vector: new Vector(item.vector),
                    lastUpdate: item.lastUpdate,
                };
            }
        }

        return undefined;
    }

    public async* partition(partition: Partition): AsyncGenerator<StoredVector, void, unknown> {
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.docClient.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :partitionKey",
                ExpressionAttributeValues: { ":partitionKey": `${this.options.databaseName}#${partition.partitionIndex}`, },
                ExclusiveStartKey: lastEvaluatedKey,
            }));

            if (result.Items) {
                for (const item of result.Items) {
                    // eslint-disable-next-line max-depth
                    if (item.deactivated) {
                        continue;
                    }

                    yield {
                        id: item.id,
                        label: item.label,
                        vector: new Vector(item.vector),
                        lastUpdate: item.lastUpdate,
                    };
                }
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
        }
        while (lastEvaluatedKey);
    }

    public async* changesAfter(timestamp: number, partition: Partition): AsyncGenerator<StoredVector, void, unknown> {
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.docClient.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :partitionKey AND lastUpdate >= :lastUpdate",
                ExpressionAttributeValues: {
                    ":partitionKey": `${this.options.databaseName}#${partition.partitionIndex}`,
                    ":lastUpdate": timestamp,
                },
                ExclusiveStartKey: lastEvaluatedKey,
                IndexName: "PK-lastUpdate-index"
            }));

            if (result.Items) {
                for (const item of result.Items) {
                    yield {
                        id: item.id,
                        label: item.label,
                        vector: new Vector(item.vector),
                        lastUpdate: item.lastUpdate,
                    };
                }
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
        }
        while (lastEvaluatedKey);
    }

    public async deleteStore() {
        const { partitions } = await this.getStats();
        // delete all items in batch
        let lastEvaluatedKey: any = undefined;

        for (let partition = 0; partition < partitions; partition++) {
            do {
                const result = await this.docClient.send(new QueryCommand({
                    TableName: this.options.tableName,
                    KeyConditionExpression: "PK = :partitionKey",
                    ExpressionAttributeValues: { ":partitionKey": `${this.options.databaseName}#${partition}`, },
                    ExclusiveStartKey: lastEvaluatedKey,
                    Limit: 100
                }));

                if (result.Items) {
                    const batch = result.Items.map(item => ({
                        Delete: {
                            TableName: this.options.tableName,
                            Key: {
                                PK: item.PK,
                                id: item.id,
                            }
                        }
                    }));

                    await this.docClient.send(new TransactWriteCommand({ TransactItems: batch }));
                }

                lastEvaluatedKey = result.LastEvaluatedKey;
            } while (lastEvaluatedKey);
        }
        // delete stats
        await this.docClient.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Delete: {
                        TableName: this.options.tableName,
                        Key: {
                            PK: `${this.options.databaseName}#STAT`,
                            id: 0
                        }
                    }
                }
            ]
        }));
    }
}