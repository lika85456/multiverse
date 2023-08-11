export type Vector = number[];

export type LabeledVector = {
    label: string;
    vector: Vector;
    uid: number;
};

export type StoredVector = LabeledVector & {
    updated: number; // timestamp
    deactivated?: true;
    // partition index is a random number between 0 and 1
    pid: number;
};

export interface Collection {
    next(partitionIndex: number, totalPartitions: number): AsyncGenerator<StoredVector, void, unknown>
    dimensions(): Promise<number>;
    size(): Promise<number>;
    get(uid: number): Promise<StoredVector | undefined>;

    databaseName(): string;
    user(): string;
}

export interface DynamicCollection extends Collection {
    add(vector: LabeledVector[]): Promise<void>;
    remove(labels: number[]): Promise<void>;
    nextChangeAfter(timestamp: number, partitionIndex: number, totalPartitions: number): AsyncGenerator<StoredVector, void, unknown>;
    deleteAll(): Promise<void>;
}

// TODO: this should be fixed somehow. It's a hack to make the compiler happy
export const x = {};