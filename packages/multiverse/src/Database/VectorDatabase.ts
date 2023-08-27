import type { DatabaseConfig } from "../DatabaseConfig";
import type Index from "../Index";
import type VectorStore from "../VectorStore/VectorStore";
import type DatabaseClient from "./DatabaseClient";
import type IndexStorage from "./IndexStorage/IndexStorage";
import { vectorDatabaseQuerySchema } from "./Vector";
import type {
    Partition, VectorDatabaseQuery, VectorDatabaseQueryResult
} from "./Vector";

export default class VectorDatabase implements DatabaseClient {

    private lastUpdateTimestamp = 0;

    constructor(private index: Index, private options: {
        partition: Partition,
        instanceId?: string,
        vectorStore: VectorStore,
        database: DatabaseConfig,
        indexStorage: IndexStorage
    }) {
        if (!options.instanceId) {
            options.instanceId = Math.random().toString(36).substring(2, 10);
        }
    }

    // TODO: This can be optimized by returing a output stream instead of an array and
    // streaming the result, meanwhile updating the index
    public async query(query: VectorDatabaseQuery): Promise<VectorDatabaseQueryResult> {

        const parsedQuery = vectorDatabaseQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
            throw new Error(`Invalid query: ${parsedQuery.error.message}`);
        }

        // update the index
        if (query.updates && query.updates.length > 0) {
            await Promise.all(query.updates.map(update => {
                if (update.deactivated) {
                    return this.index.remove([update.id]);
                }

                return this.index.add([update]);
            }));
        }

        const lastUpdateTimestamp = Math.max(...(query.updates ?? []).map(update => update.lastUpdate), this.lastUpdateTimestamp);

        const result = await this.index.knn(query.query);

        return {
            partition: this.options.partition,
            result,
            instanceId: this.options.instanceId!,
            lastUpdateTimestamp
        };
    }

    public async indexCollection() {
        const iterator = this.options.vectorStore.partition(this.options.partition);

        for await (const item of iterator) {
            await this.index.add([item]);
        }

        const { indexStorage, database: { databaseName, owner } } = this.options;

        await indexStorage.saveIndex(this.index, `${owner}_${databaseName}_${this.options.partition}`);
    }

    public async loadIndexCollection() {
        const { indexStorage, database: { databaseName, owner } } = this.options;

        const lastSnapshot = await indexStorage.findLatestIndexSave(`${owner}_${databaseName}_${this.options.partition}`);

        if (!lastSnapshot) {
            throw new Error("No stored index found");
        }

        await indexStorage.loadIndex(this.index, lastSnapshot);
    }
}