import type { Worker, WorkerQueryResult } from "../Compute/Worker";

/**
 * Because workers need to be available at all times, they have multiple fallback instances that are warmed up periodically.
 *
 * Out of region instances could be possible, but they would be probably very expensive, since S3 transfer between regions is not free.
 */
export default class PartitionWorker implements Worker {

    constructor(private options: {
        instances: number; // the amount of warm instances
        
    }) {

    }

    query(query: { query: { vector: number[]; k: number; sendVector: boolean; metadataExpression?: string | undefined; }; updates?: ({ vector: { vector: number[]; label: string; metadata?: Record<string, string> | undefined; }; action: "add"; timestamp: number; } | { label: string; action: "remove"; timestamp: number; })[] | undefined; }): Promise<WorkerQueryResult> {
        throw new Error("Method not implemented.");
    }

    add(vectors: { vector: number[]; label: string; metadata?: Record<string, string> | undefined; }[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    remove(labels: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    wake(wait: number): Promise<void> {
        throw new Error("Method not implemented.");
    }

    saveSnapshot(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    loadLatestSnapshot(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        throw new Error("Method not implemented.");
    }

}