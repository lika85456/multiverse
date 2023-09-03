import { z } from "zod";
import type { QueryResult } from "./Query";
import { querySchema } from "./Query";
import { storedVectorChangeSchema } from "../ChangesStorage";

export const databaseQuerySchema = z.object({
    query: querySchema,
    updates: z.array(storedVectorChangeSchema),
});

export type DatabaseQuery = z.infer<typeof databaseQuerySchema>;

export type DatabaseQueryResult = {
    result: QueryResult;
    state: DatabaseClientState;
};

export type DatabaseClientState = {
    instanceId: string;
    lastUpdate: number;
    memoryUsed: number;
    memoryLimit: number;
    ephemeralUsed: number;
    ephemeralLimit: number;
};

export default interface DatabaseClient {
    query(query: DatabaseQuery): Promise<DatabaseQueryResult>;
    wake(wait: number): Promise<void>;
    saveSnapshot(): Promise<void>;
    loadLatestSnapshot(): Promise<void>;
}