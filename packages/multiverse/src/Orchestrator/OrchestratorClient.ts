import type { Query, QueryResult } from "../Database/Query";
import type { NewVector } from "../Vector";

export default interface OrchestratorClient {
    query(query: Query): Promise<QueryResult>;
    add(vector: NewVector[]): Promise<void>;
    remove(label: string[]): Promise<void>;
    wake(): Promise<void>;
    count(): Promise<{
        vectors: number,
        vectorDimensions: number
    }>;
}