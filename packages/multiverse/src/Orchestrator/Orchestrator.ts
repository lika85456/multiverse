import type { DatabaseConfiguration, Token } from "../core/DatabaseConfiguration";
import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";

export default interface Orchestrator {
    query(query: Query): Promise<QueryResult>;
    addVectors(vectors: NewVector[]): Promise<void>;
    removeVectors(labels: string[]): Promise<void>;
    getConfiguration(): Promise<DatabaseConfiguration>;
    addToken(token: Token): Promise<void>;
    removeToken(tokenName: string): Promise<void>;
    auth(token: Token): Promise<boolean>;
}