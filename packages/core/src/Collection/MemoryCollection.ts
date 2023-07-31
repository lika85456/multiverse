import type { DynamicCollection, LabeledVector } from "./Collection";
import { Readable } from "stream";

export default class MemoryCollection implements DynamicCollection {
    private vectors: (LabeledVector & {timestamp: number})[];

    constructor(vectors: LabeledVector[]) {
        this.vectors = vectors.map(v => ({
            ...v,
            timestamp: Date.now()
        }));
    }

    changesAfter(timestamp: number): Promise<LabeledVector[]> {
        return Promise.resolve(this.vectors.filter(v => v.timestamp > timestamp).map(v => ({
            ...v,
            timestamp: undefined
        })));
    }

    add(vector: LabeledVector[]): Promise<void> {
        this.vectors.push(...vector.map(v => ({
            ...v,
            timestamp: Date.now()
        })));
        return Promise.resolve();
    }

    remove(labels: string[]): Promise<void> {
        this.vectors = this.vectors.filter(v => !labels.includes(v.label));
        return Promise.resolve();
    }

    public async readStream(): Promise<Readable> {
        const vectorsRef = this.vectors;

        return new Readable({
            objectMode: true,
            read() {
                vectorsRef.forEach(v => this.push({
                    ...v,
                    timestamp: undefined
                }));
                this.push(null);
            }
        });
    }
}