import { z } from "zod";

export class Vector {
    constructor(private vector: number[]) {

    }

    public toArray(): number[] {
        return this.vector;
    }
}

export class Base64Vector extends Vector {
    constructor(private base64: string) {
        super([]);
    }

    public toArray(): number[] {
        return Array.from(Buffer.from(this.base64, "base64"));
    }

    public static fromArray(vector: number[]): Base64Vector {
        return new Base64Vector(Buffer.from(vector).toString("base64"));
    }

    public toString(): string {
        return this.base64;
    }
}

export type LabeledVector = {
    label: string;
    vector: Vector;
};

export type StoredVector = LabeledVector & {
    lastUpdate: number;
    deactivated?: boolean | number;
    id: number;
};

export type SearchResultVector = {
    id: number;
    distance: number;
};

export class Partition {

    constructor(public partitionIndex: number, public partitionCount: number) {
        if (partitionIndex < 0 || partitionIndex >= partitionCount) {
            throw new Error("Invalid partition index: must be >= 0 and < partitionCount");
        }

        // whole number
        if (partitionIndex % 1 !== 0) {
            throw new Error("Invalid partition index: must be a whole number");
        }
    }

    public normalize(): number {
        return this.partitionIndex / this.partitionCount;
    }

    public start(): number {
        return this.partitionIndex / this.partitionCount;
    }

    public end(): number {
        return (this.partitionIndex + 1) / this.partitionCount;
    }

};

export const querySchema = z.object({
    vector: z.instanceof(Vector),
    k: z.number()
});

export type Query = z.infer<typeof querySchema>;

export const vectorDatabaseQuerySchema = z.object({
    query: querySchema,
    updates: z.array(z.object({
        id: z.number(),
        label: z.string(),
        lastUpdate: z.number(),
        vector: z.instanceof(Vector),
        deactivated: z.boolean().optional()
    })).optional()
});

export type VectorDatabaseQuery = z.infer<typeof vectorDatabaseQuerySchema>;

export type VectorDatabaseQueryResult = {
    partition: Partition;
    result: SearchResultVector[];
    instanceId: string;
    lastUpdateTimestamp: number;
};