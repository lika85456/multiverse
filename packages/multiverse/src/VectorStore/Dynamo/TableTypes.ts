type DatabaseName = string;
type Partition = number;

export type Stats = {
    PK: `${DatabaseName}`;
    SK: "STATS";
    totalVectors: number;
    activeVectors: number;
    partitions: number;
};

export type PartitionStats = {
    PK: `${DatabaseName}#${Partition}`;
    SK: "STATS";
    totalVectors: number;
    activeVectors: number;
};

export type Vector = {
    PK: `${DatabaseName}#${Partition}`;
    SK: string; // random long id
    label: string;
    vector: number[]; // or binary data?
    updated: number; // timestamp
    deactivated?: number | boolean;
    metadata: string; // anything
};