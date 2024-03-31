import type ChangesStorage from "../ChangesStorage";
import type { Worker } from "../Compute/Worker";
import mergeResults from "../Index/mergeResults";
import type InfrastructureStorage from "../InfrastructureStorage";
import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";
import type OrchestratorClient from "./OrchestratorClient";

export default class OrchestratorWorker implements OrchestratorClient {
    constructor(private options: {
        changesStorage: ChangesStorage,
        infrastructureStorage: InfrastructureStorage,
        workers: {
            worker: Worker,
            partition: number,
        }[],
    }) {

    }

    public async query(query: Query): Promise<QueryResult> {
        const results = await Promise.all(this.options.workers.map(async worker => {
            return (await worker.worker.query({ query })).result.result;
        }));

        const mergedResult = mergeResults(results);

        return { result: mergedResult, };
    }

    public async add(vector: NewVector[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async remove(label: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async wake(): Promise<void> {

    }

    public async count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        throw new Error("Method not implemented.");
    }
}