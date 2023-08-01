import type { DynamicCollection, LabeledVector } from "./Collection";
import { Readable } from "stream";

export default class MemoryCollection implements DynamicCollection {
    private vectors: (LabeledVector & {timestamp: number, deactivated?: true})[];

    constructor(private options: {
        vectors: LabeledVector[];
        dimensions: number;
    }) {
        this.vectors = this.options.vectors.map(v => ({
            ...v,
            timestamp: Date.now()
        }));
    }

    changesAfter(timestamp: number): Promise<(LabeledVector & {deactivated?: true})[]> {
        return Promise.resolve(this.vectors.filter(v => v.timestamp > timestamp).map(v => ({
            ...v,
            timestamp: undefined
        })));
    }

    add(vectors: LabeledVector[]): Promise<void> {
        vectors.forEach(vector => {
            // if exists reactivate
            const existing = this.vectors.find(v => v.label === vector.label);
            if (existing) {
                existing.deactivated = undefined;
                existing.vector = vector.vector;
                existing.timestamp = Date.now();

                return;
            }

            // if not exists add
            this.vectors.push({
                ...vector,
                timestamp: Date.now()
            });
        });

        return Promise.resolve();
    }

    remove(labels: number[]): Promise<void> {
        this.vectors.forEach(v => {
            if (labels.includes(v.label)) {
                v.deactivated = true;
                v.timestamp = Date.now();
            }
        });

        return Promise.resolve();
    }

    cleanupRemoved() {
        this.vectors = this.vectors.filter(v => !v.deactivated);
    }

    public async dimensions(): Promise<number> {
        return this.options.dimensions;
    }

    public async size(): Promise<number> {
        return this.vectors.length;
    }

    public async readStream(): Promise<Readable> {
        const vectorsRef = this.vectors.filter(v => !v.deactivated);

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