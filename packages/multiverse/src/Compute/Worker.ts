import { z } from "zod";
import type { QueryResult } from "../core/Query";
import { querySchema } from "../core/Query";
import { storedVectorChangeSchema } from "../ChangesStorage";
import type { NewVector } from "../core/Vector";

export const workerQuerySchema = z.object({
    query: querySchema,
    updates: z.array(storedVectorChangeSchema).optional(),
});

export type WorkerQuery = z.infer<typeof workerQuerySchema>;

export type WorkerQueryResult = {
    result: QueryResult;
    state: WorkerState;
};

export type WorkerState = {
    instanceId: string;
    lastUpdate: number;
    memoryUsed: number;
    memoryLimit: number;
    ephemeralUsed: number;
    ephemeralLimit: number;
};

export interface Worker {
    query(query: WorkerQuery): Promise<WorkerQueryResult>;
    add(vectors: NewVector[]): Promise<void>;
    remove(labels: string[]): Promise<void>;
    wake(wait: number): Promise<void>;
    saveSnapshot(): Promise<void>;
    loadLatestSnapshot(): Promise<void>;
    count(): Promise<{
        vectors: number,
        vectorDimensions: number
    }>;
    state(): Promise<WorkerState>;
}