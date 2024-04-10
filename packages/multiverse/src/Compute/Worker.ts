import { z } from "zod";
import type { QueryResult } from "../core/Query";
import { querySchema } from "../core/Query";
import type { StoredVectorChange } from "../ChangesStorage";
import { storedVectorChangeSchema } from "../ChangesStorage";

export const workerQuerySchema = z.object({
    query: querySchema,
    updates: z.array(storedVectorChangeSchema).optional(),
});

export type WorkerQuery = z.infer<typeof workerQuerySchema>;

export type WorkerQueryResult = QueryResult;

export type WorkerState = {
    instanceId: string;
    lastUpdate: number;
    memoryUsed: number;
    memoryLimit: number;
    ephemeralUsed: number;
    ephemeralLimit: number;
};

export type StatefulResponse<T> = {
    result: T;
    state: WorkerState;
};

export interface Worker {
    query(query: WorkerQuery): Promise<StatefulResponse<WorkerQueryResult>>;
    update(updates: StoredVectorChange[]): Promise<StatefulResponse<void>>;
    saveSnapshot(): Promise<StatefulResponse<void>>;
    loadLatestSnapshot(): Promise<StatefulResponse<void>>;
    count(): Promise<StatefulResponse<{
        vectors: number,
        vectorDimensions: number
    }>>;
    state(): Promise<StatefulResponse<void>>;
}