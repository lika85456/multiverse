import type { Readable } from "stream";

export type Vector = number[];
export type LabeledVector = {
    label: number;
    vector: Vector;
};

export interface Collection {
    readStream(): Promise<Readable>;
    dimensions(): Promise<number>;
    size(): Promise<number>;
}

export interface DynamicCollection extends Collection {
    add(vector: LabeledVector[]): Promise<void>;
    remove(labels: number[]): Promise<void>;
    changesAfter(timestamp: number): Promise<LabeledVector[]>;
}

// TODO: this should be fixed somehow. It's a hack to make the compiler happy
export const x = {};