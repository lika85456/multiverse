import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, GetCommand, QueryCommand, BatchWriteCommand, UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import type { StoredVector } from "../../Database/Vector";
import { Base64Vector, Vector } from "../../Database/Vector";
import type { Partition } from "../../Database/VectorDatabase";
import type VectorStore from "../VectorStore";
import type { Stats, PartitionStats } from "./TableTypes";
import TTLCache from "@isaacs/ttlcache";

const cache = new TTLCache<string, {stats: Stats, partitionStats: PartitionStats[]}>({
    max: 1000,
    ttl: 1000 * 60 * 5,
});

export class UnprocessedItemsError extends Error {
    constructor(public unprocessedItems: any) {
        super("Unprocessed items");
    }

    public toString() {
        return `Unprocessed items: ${JSON.stringify(this.unprocessedItems, null, 2)}`;
    }
}

// type DatabaseName = string;
// type Partition = number;

// export type Stats = {
//     PK: `${DatabaseName}`;
//     SK: "STATS";
//     totalVectors: number;
//     activeVectors: number;
//     partitions: number;
// };

// export type PartitionStats = {
//     PK: `${DatabaseName}#${Partition}`;
//     SK: "STATS";
//     totalVectors: number;
//     activeVectors: number;
// };

// export type Vector = {
//     PK: `${DatabaseName}#${Partition}`;
//     SK: string; // random long id
//     label: string;
//     vector: number[]; // or binary data?
//     updated: number; // timestamp
//     deactivated?: number | boolean;
//     metadata: string; // anything
// };

export default class DynamoVectorStore implements VectorStore {

    private docClient: DynamoDBDocumentClient;

    constructor(private options: {
        databaseName: string
        tableName: string,
        region: string,
        dimensions: number,
    }) {
        const client = new DynamoDBClient({ region: this.options.region });
        this.docClient = DynamoDBDocumentClient.from(client);
    }

    private async downloadStats() {
        const { Item: databaseStats } = await this.docClient.send(new GetCommand({
            TableName: this.options.tableName,
            Key: {
                PK: this.options.databaseName,
                SK: "STATS"
            }
        }));

        if (!databaseStats) {
            const stats = {
                stats: {
                    PK: this.options.databaseName,
                    SK: "STATS",
                    totalVectors: 0,
                    activeVectors: 0,
                    partitions: 1,
                },
                partitionStats: [{
                    PK: `${this.options.databaseName}#${0}`,
                    SK: "STATS",
                    totalVectors: 0,
                    activeVectors: 0,
                }]
            };

            cache.set(this.options.tableName, stats as any);

            return stats as any;
        }

        const partitionStats = await Promise.all(Array.from({ length: databaseStats.partitions }, (_, i) => i).map(async(partition) => {
            const { Item: partitionStats } = await this.docClient.send(new GetCommand({
                TableName: this.options.tableName,
                Key: {
                    PK: `${this.options.databaseName}#${partition}`,
                    SK: "STATS"
                }
            }));

            return partitionStats;
        }));

        cache.set(this.options.tableName, {
            stats: databaseStats as Stats,
            partitionStats: partitionStats as PartitionStats[]
        });

        return {
            stats: databaseStats as Stats,
            partitionStats: partitionStats as PartitionStats[]
        };
    }

    private async getStats(): Promise<{stats: Stats, partitionStats: PartitionStats[]}> {

        const cached = cache.get(this.options.tableName);

        const downloadedStatsPromise = this.downloadStats();

        if (cached) {
            return cached;
        }

        return downloadedStatsPromise;
    }

    /**
     *
     * @returns partition id to add vectors to
     */
    private async partitionToAddTo(): Promise<number> {
        // 1GB = 1,000,000,000 bytes
        // 1 vector dimension = 4 bytes
        const MAX_VECTOR_DIMENSIONS_PER_PARTITION = 1_000_000_000 / 4;

        const { stats: databaseStats, partitionStats } = await this.getStats();

        // find first partition that has less than MAX_VECTOR_DIMENSIONS_PER_PARTITION
        // or if none, find partition with least vectors
        let leastVectors = Infinity;
        for (let i = 0; i < databaseStats.partitions; i++) {
            if (partitionStats[i].totalVectors < leastVectors) {
                leastVectors = partitionStats[i].totalVectors;
            }

            if (partitionStats[i].totalVectors * this.options.dimensions < MAX_VECTOR_DIMENSIONS_PER_PARTITION) {
                return i;
            }
        }

        return partitionStats.findIndex(partition => partition.totalVectors === leastVectors);
    }

    public async add(vectors: StoredVector[]): Promise<void> {

        if (vectors.length === 0) {
            return;
        }

        if (vectors.some(v => v.vector.toArray().length !== this.options.dimensions)) {
            throw new Error("Invalid vector dimensions in one or more vectors");
        }

        // split call to batches
        const MAXIMUM_BATCH_SIZE = 25;
        if (vectors.length > MAXIMUM_BATCH_SIZE) {
            await Promise.all(Array.from({ length: Math.ceil(vectors.length / MAXIMUM_BATCH_SIZE) }, (_, i) => i).map(async(i) => {
                await this.add(vectors.slice(i * MAXIMUM_BATCH_SIZE, (i + 1) * MAXIMUM_BATCH_SIZE));
            }));
        }

        const partition = await this.partitionToAddTo();
        // transaction writes are expensive, so we batch write them and
        // retry updating stats if it fails.
        // const batch = vectors.map(vector => ({
        //     Put: {
        //         TableName: this.options.tableName,
        //         Item: {
        //             PK: `${this.options.databaseName}#${partition}`,
        //             SK: vector.id.toString(),
        //             label: vector.label,
        //             vector: vector.vector,
        //             lastUpdate: vector.lastUpdate,
        //             deactivated: vector.deactivated,
        //         }
        //     }
        // }));

        // const result = await this.docClient.send(new BatchWriteCommand({ RequestItems: { [this.options.tableName]: batch } }));

        const unproccessedItemsLength = result.UnprocessedItems?.[this.options.tableName]?.length ?? 0;
        const processedItemsLength = vectors.length - unproccessedItemsLength;

        if (unproccessedItemsLength > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // update stats
        await Promise.all([
            this.docClient.send(new UpdateCommand({
                TableName: this.options.tableName,
                Key: {
                    PK: `${this.options.databaseName}`,
                    SK: "STATS"
                },
                UpdateExpression: "ADD activeVectors :addedVectors, totalVectors :addedVectors",
                ExpressionAttributeValues: { ":addedVectors": processedItemsLength, }
            })),
            this.docClient.send(new UpdateCommand({
                TableName: this.options.tableName,
                Key: {
                    PK: `${this.options.databaseName}#${partition}`,
                    SK: "STATS"
                },
                UpdateExpression: "ADD activeVectors :addedVectors, totalVectors :addedVectors",
                ExpressionAttributeValues: { ":addedVectors": processedItemsLength, }
            }))
        ]);

        // if there are some unprocessed items, throw error
        if (unproccessedItemsLength > 0) {
            throw new UnprocessedItemsError(result.UnprocessedItems);
        }
    }

    public async remove(ids: number[]): Promise<void> {

        if (ids.length === 0) {
            return Promise.resolve();
        }

        const MAXIMUM_BATCH_SIZE = 24;
        if (ids.length > MAXIMUM_BATCH_SIZE) {
            await Promise.all(Array.from({ length: Math.ceil(ids.length / MAXIMUM_BATCH_SIZE) }, (_, i) => i).map(async(i) => {
                await this.remove(ids.slice(i * MAXIMUM_BATCH_SIZE, (i + 1) * MAXIMUM_BATCH_SIZE));
            }));
        }

        const { stats: databaseStats } = await this.getStats();

        if (databaseStats.partitions > 1) {
            throw new Error("Not implemented removing vectors from multiple partitions");
        }

        const batch = ids.map(id => ({
            Update: {
                TableName: this.options.tableName,
                Key: {
                    PK: `${this.options.databaseName}#0`,
                    SK: id.toString(),
                },
                UpdateExpression: "SET deactivated = :deactivated",
                ExpressionAttributeValues: { ":deactivated": Date.now(), }
            }
        }));

        const result = await this.docClient.send(new BatchWriteCommand({ RequestItems: { [this.options.tableName]: batch } }));

        const unproccessedItemsLength = result.UnprocessedItems?.[this.options.tableName]?.length ?? 0;
        const processedItemsLength = ids.length - unproccessedItemsLength;

        if (unproccessedItemsLength > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // update stats
        await Promise.all([
            this.docClient.send(new UpdateCommand({
                TableName: this.options.tableName,
                Key: {
                    PK: `${this.options.databaseName}`,
                    SK: "STATS"
                },
                UpdateExpression: "ADD activeVectors :addedVectors",
                ExpressionAttributeValues: { ":addedVectors": -processedItemsLength, }
            })),
            this.docClient.send(new UpdateCommand({
                TableName: this.options.tableName,
                Key: {
                    PK: `${this.options.databaseName}#0`,
                    SK: "STATS"
                },
                UpdateExpression: "ADD activeVectors :addedVectors",
                ExpressionAttributeValues: { ":addedVectors": -processedItemsLength, }
            }))
        ]);

        // if there are some unprocessed items, throw error
        if (unproccessedItemsLength > 0) {
            throw new UnprocessedItemsError(result.UnprocessedItems);
        }
    }

    public async getByLabel(label: string): Promise<StoredVector | undefined> {
        // label-PK-index

        const { Items: items } = await this.docClient.send(new QueryCommand({
            TableName: this.options.tableName,
            IndexName: "label-PK-index",
            KeyConditionExpression: "label = :label AND begins_with(PK, :databaseName)",
            ExpressionAttributeValues: {
                ":label": label,
                ":databaseName": `${this.options.databaseName}#`,
            },
            Limit: 1
        }));

        if (!items?.length) {
            return undefined;
        }

        if (items?.length > 1) {
            throw new Error("More than one vector found");
        }

        const item = items[0];

        return {
            id: item.id,
            label: item.label,
            vector: new Vector(item.vector),
            lastUpdate: item.lastUpdate,
        };
    }

    public async* partition(partition: Partition): AsyncGenerator<StoredVector, void, unknown> {
        let lastEvaluatedKey: any = undefined;

        do {
            const result = await this.docClient.send(new QueryCommand({
                TableName: this.options.tableName,
                KeyConditionExpression: "PK = :databaseName",
                ExpressionAttributeValues: { ":databaseName": `${this.options.databaseName}#${partition.partitionIndex}`, },
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
                KeyConditionExpression: "PK = :partitionKey AND updated >= :lastUpdate",
                ExpressionAttributeValues: {
                    ":partitionKey": `${this.options.databaseName}#${partition.partitionIndex}`,
                    ":lastUpdate": timestamp,
                },
                ExclusiveStartKey: lastEvaluatedKey,
                IndexName: "PK-updated-index"
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
        // delete everything that starts with databaseName
        // let lastEvaluatedKey: any = undefined;

        // do {
        //     const result = await this.docClient.send(new QueryCommand({
        //         TableName: this.options.tableName,
        //         KeyConditionExpression: "PK = :databaseName",
        //         ExpressionAttributeValues: { ":databaseName": `${this.options.databaseName}`, },
        //         ExclusiveStartKey: lastEvaluatedKey,
        //     }));

        //     if (result.Items) {
        //         const batch = result.Items.map(item => ({
        //             Delete: {
        //                 TableName: this.options.tableName,
        //                 Key: {
        //                     PK: item.PK,
        //                     SK: item.SK,
        //                 }
        //             }
        //         }));

        //         await this.docClient.send(new BatchWriteCommand({ RequestItems: { [this.options.tableName]: batch } }));
        //     }

        //     lastEvaluatedKey = result.LastEvaluatedKey;

        // } while (lastEvaluatedKey);

        // TODO implement me
    }
}