import type Index from "../Index";
import type {
    SearchResultVector, StoredVector, Vector
} from "./Vector";

export type Query = {
    vector: Vector;
    k: number;
};

export class Partition {
    // partitionIndex: number;
    // partitionCount: number;

    constructor(public partitionIndex: number, public partitionCount: number) {
        if (partitionIndex < 0 || partitionIndex >= partitionCount) {
            throw new Error("Invalid partition index: must be >= 0 and < partitionCount");
        }

        // whole number
        if (partitionIndex % 1 !== 0) {
            throw new Error("Invalid partition index: must be a whole number");
        }
    }

    public normalize(): number {
        return this.partitionIndex / this.partitionCount;
    }

    public start(): number {
        return this.partitionIndex / this.partitionCount;
    }

    public end(): number {
        return (this.partitionIndex + 1) / this.partitionCount;
    }

};

export type VectorDatabaseQuery = {
    query: Query;
    updates: StoredVector[];
};

export type VectorDatabaseQueryResult = {
    partition: Partition;
    result: SearchResultVector[];
    instanceId: string;
    lastUpdateTimestamp: number;
};

export default class VectorDatabase {

    private lastUpdateTimestamp = 0;

    constructor(private index: Index, private options: {
        partition:Partition,
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
        await Promise.all(query.updates.map(update => {
            if (update.deactivated) {
                return this.index.remove([update.id]);
            }

            return this.index.add([update]);
        }));

        const lastUpdateTimestamp = Math.max(...query.updates.map(update => update.lastUpdate), this.lastUpdateTimestamp);

        const result = await this.index.knn(query.query);

        return {
            partition: this.options.partition,
            result,
            instanceId: this.options.instanceId!,
            lastUpdateTimestamp
        };
    }

}