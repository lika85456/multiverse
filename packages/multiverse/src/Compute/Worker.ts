import { z } from "zod";
import type { QueryResult } from "../core/Query";
import { querySchema } from "../core/Query";
import type { StoredVectorChange } from "../ChangesStorage/StoredVector";
import { storedVectorChangeSchema } from "../ChangesStorage/StoredVector";

export const workerQuerySchema = z.object({
    query: querySchema,
    updates: z.array(storedVectorChangeSchema).optional(),

    updateSnapshotIfOlderThan: z.number().optional(),
});

export type WorkerQuery = z.infer<typeof workerQuerySchema>;

export type WorkerQueryResult = QueryResult;

export type WorkerState = {
    instanceId: string;
    partitionIndex: number;

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

export type CountResponse = {
    vectors: number,
    vectorDimensions: number,
    // TODO: stored bytes
};

export type WorkerType = "primary" | "secondary" | "fallback";

export interface Worker {
    query(query: WorkerQuery): Promise<StatefulResponse<WorkerQueryResult>>;
    update(updates: StoredVectorChange[]): Promise<StatefulResponse<void>>;

    saveSnapshot(): Promise<StatefulResponse<void>>;
    saveSnapshotWithUpdates(updates: StoredVectorChange[]): Promise<StatefulResponse<void>>;
    loadLatestSnapshot(): Promise<StatefulResponse<void>>;

    count(): Promise<StatefulResponse<CountResponse>>;
    state(): Promise<StatefulResponse<void>>;
}