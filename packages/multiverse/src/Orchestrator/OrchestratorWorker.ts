import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";
import type IndexManager from "./IndexManager";
import type InfrastructureManager from "./InfrastructureManager";
import type OrchestratorClient from "./OrchestratorClient";

export default class OrchestratorWorker implements OrchestratorClient {
    constructor(private options: {
        indexManager: IndexManager;
        infrastructureManager: InfrastructureManager;
    }) {

    }

    query(query: Query): Promise<QueryResult> {
        return this.options.indexManager.query(query);
    }

    add(vectors: NewVector[]): Promise<void> {
        return this.options.indexManager.add(vectors);
    }

    remove(label: string[]): Promise<void> {
        return this.options.indexManager.remove(label);
    }

    wake(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        return this.options.indexManager.count();
    }
}