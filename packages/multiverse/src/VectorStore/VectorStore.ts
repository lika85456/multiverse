import type { StoredVector } from "../Database/Vector";
import type { Partition } from "../Database/VectorDatabase";

export default interface VectorStore {
    add(vectors: StoredVector[]): Promise<void>;
    remove(ids: number[]): Promise<void>;
    cleanupBefore(timestamp: number): Promise<void>;
    getByLabel(label: string): Promise<StoredVector | undefined>;
    partition(partition:Partition): AsyncGenerator<StoredVector, void, unknown>;
    changesAfter(timestamp: number, partition: Partition): AsyncGenerator<StoredVector, void, unknown>;
}