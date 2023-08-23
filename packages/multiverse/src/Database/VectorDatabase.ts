import type Index from "../Index";
import type {
    Partition, VectorDatabaseQuery, VectorDatabaseQueryResult
} from "./Vector";

export default class VectorDatabase {

    private lastUpdateTimestamp = 0;

    constructor(private index: Index, private options: {
        partition: Partition,
        instanceId?: string,
    }) {
        if (!options.instanceId) {
            options.instanceId = Math.random().toString(36).substring(2, 10);
        }
    }

    // TODO: This can be optimized by returing a output stream instead of an array and
    // streaming the result, meanwhile updating the index
    public async query(query: VectorDatabaseQuery): Promise<VectorDatabaseQueryResult> {

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

}