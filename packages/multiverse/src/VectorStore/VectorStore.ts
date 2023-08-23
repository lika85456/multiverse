import type { Partition, StoredVector } from "../Database/Vector";

export default interface VectorStore {
    add(vectors: StoredVector[]): Promise<void>;
    remove(ids: number[]): Promise<void>;
    getByLabel(label: string): Promise<StoredVector | undefined>;
    partition(partition: Partition): AsyncGenerator<StoredVector, void, unknown>;
    changesAfter(timestamp: number, partition: Partition): AsyncGenerator<StoredVector, void, unknown>;
}