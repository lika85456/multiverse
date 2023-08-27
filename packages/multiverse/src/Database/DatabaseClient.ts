import type { VectorDatabaseQuery, VectorDatabaseQueryResult } from "./Vector";

export default interface DatabaseClient{
    query(query: VectorDatabaseQuery): Promise<VectorDatabaseQueryResult>;

    indexCollection(): Promise<void>;
    loadIndexCollection(): Promise<void>;
}