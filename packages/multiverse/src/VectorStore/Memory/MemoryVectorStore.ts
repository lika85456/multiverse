import type { Partition, StoredVector } from "../../Database/Vector";
import type VectorStore from "../VectorStore";

export default class MemoryVectorStore implements VectorStore {

    private vectors: StoredVector[] = [];

    add(vectors: StoredVector[]): Promise<void> {
        this.vectors.push(...vectors);

        return Promise.resolve();
    }

    remove(labels: string[]): Promise<void>;
    remove(ids: number[]): Promise<void>;
    remove(ids: unknown): Promise<void> {

        if (!Array.isArray(ids)) {
            throw new Error("Invalid argument");
        }

        ids.forEach(id => {
            const vector = this.vectors.find(vector => vector.id === id || vector.label === id);
            if (vector) {
                vector.deactivated = true;
            }
        });

        return Promise.resolve();
    }

    getByLabel(label: string): Promise<StoredVector | undefined> {
        return Promise.resolve(this.vectors.find(vector => vector.label === label && !vector.deactivated));
    }

    public async* partition(_partition: Partition): AsyncGenerator<StoredVector, void, unknown> {

        for (let i = 0; i < this.vectors.length; i++) {
            const vector = this.vectors[i];
            if (!vector.deactivated) {
                yield vector;
            }
        }
    }

    public async* changesAfter(timestamp: number, _partition: Partition): AsyncGenerator<StoredVector, void, unknown> {

        for (let i = 0; i < this.vectors.length; i++) {
            const vector = this.vectors[i];
            if (vector.lastUpdate >= timestamp && !vector.deactivated) {
                yield vector;
            }
        }
    }

    public async cleanupBefore(timestamp: number): Promise<void> {
        this.vectors = this.vectors.filter(vector => !vector.deactivated || vector.lastUpdate >= timestamp);
    }
}