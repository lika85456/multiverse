import type { StoredDatabaseConfiguration, Token } from "../core/DatabaseConfiguration";
import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";

export type OrchestratorEvent = {
    event: keyof Orchestrator,
    payload: Parameters<Orchestrator[keyof Orchestrator]>,
    secretToken: string;
};

export default interface Orchestrator {
    initialize(): Promise<void>;
    query(query: Query): Promise<QueryResult>;
    addVectors(vectors: NewVector[]): Promise<{unprocessedItems: string[]}>;
    removeVectors(labels: string[]): Promise<{unprocessedItems: string[]}>;
    getConfiguration(): Promise<StoredDatabaseConfiguration>;
    addToken(token: Token): Promise<void>;
    removeToken(tokenName: string): Promise<void>;
    auth(secret: string): Promise<boolean>;
    wakeUpWorkers(): Promise<void>;
    ping(wait?: number): Promise<string>;
}