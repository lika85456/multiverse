import type { Partition } from "../Database/VectorDatabase";
import type VectorStore from "./VectorStore";

export async function readPartition(store: VectorStore, partition: Partition) {
    const vectors = store.partition(partition);

    const result = [];

    for await (const vector of vectors) {
        result.push(vector);
    }

    return result;
}

export async function readPartitionAfter(store: VectorStore, partition: Partition, timestamp: number) {
    const vectors = store.changesAfter(timestamp, partition);

    const result = [];

    for await (const vector of vectors) {
        result.push(vector);
    }

    return result;
}