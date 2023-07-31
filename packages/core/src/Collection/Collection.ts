import type { Readable } from "stream";

export type Vector = number[];
export type LabeledVector = {
    label: string;
    vector: Vector;
};

export interface Collection {
    readStream(): Promise<Readable>;
}

export interface DynamicCollection extends Collection {
    add(vector: LabeledVector[]): Promise<void>;
    remove(labels: string[]): Promise<void>;
    changesAfter(timestamp: number): Promise<LabeledVector[]>;
}