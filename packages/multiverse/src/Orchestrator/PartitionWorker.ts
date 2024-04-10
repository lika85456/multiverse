import { Lambda } from "@aws-sdk/client-lambda";
import type {
    Worker, WorkerQueryResult, WorkerState
} from "../Compute/Worker";
import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";
import type { Infrastructure, PartitionInfrastructureState } from "../InfrastructureStorage";
import type InfrastructureStorage from "../InfrastructureStorage";
import LambdaWorker from "../Compute/LambdaWorker";

/**
 * Because workers need to be available at all times, they have multiple fallback instances that are warmed up periodically.
 *
 * Out of region instances could be possible, but they would be probably very expensive, since S3 transfer between regions is not free.
 */
export default class PartitionWorker implements Worker {

    //     configuration: DatabaseConfiguration;
    //     partitions: {
    //         lambda: {
    //             name: string;
    //             region: string;
    //             type: "primary" | "fallback";
    //             wakeUpInstances: number;
    //             instances: {
    //                 id: string;
    //                 lastUpdated: number;
    //             }[];
    //         }[];
    //         partitionIndex: number;
    //     }[];
    // }

    private infrastructureStorage: InfrastructureStorage;
    private partitionIndex: number;
    private databaseName: string;

    private partition: Promise<PartitionInfrastructureState>;
    private lambdaNamesByPriority: Promise<string[]>;

    private REQUEST_TIMEOUT = 2000;

    constructor(options: {
        infrastructureStorage: InfrastructureStorage;
        partitionIndex: number;
        databaseName: string;
    }) {
        this.partitionIndex = options.partitionIndex;
        this.infrastructureStorage = options.infrastructureStorage;
        this.databaseName = options.databaseName;

        this.partition = this.infrastructureStorage.get(options.databaseName).then(infrastructure => {
            if (!infrastructure) {
                throw new Error(`Database ${options.databaseName} not found`);
            }

            const partition = infrastructure.partitions.find(p => p.partitionIndex === options.partitionIndex);
            if (!partition) {
                throw new Error(`Partition ${options.partitionIndex} not found`);
            }

            return partition;
        });

        this.lambdaNamesByPriority = this.partition.then(partition => {
            const primary = partition.lambda.find(l => l.type === "primary");
            if (!primary) {
                throw new Error("Primary not found");
            }

            const secondaries = partition.lambda.filter(l => l.type === "fallback" && l.region === primary.region);

            const regions = partition.lambda.filter(l => l.region !== primary.region);

            const lambdaNames = [primary.name, ...secondaries.map(s => s.name), ...regions.map(r => r.name)];

            return lambdaNames;
        });
    }

    private async request<T>(event: string, payload: any): Promise<T> {
        const lambda = new LambdaWorker()
    }

    public async state(): Promise<WorkerState> {
        throw new Error("Method not implemented.");
    }

    public async query(query: { query: { vector: number[]; k: number; sendVector: boolean; metadataExpression?: string | undefined; }; updates?: ({ vector: { vector: number[]; label: string; metadata?: Record<string, string> | undefined; }; action: "add"; timestamp: number; } | { label: string; action: "remove"; timestamp: number; })[] | undefined; }): Promise<WorkerQueryResult> {
        throw new Error("Method not implemented.");
    }

    public async add(vectors: { vector: number[]; label: string; metadata?: Record<string, string> | undefined; }[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async remove(labels: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async wake(wait: number): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async saveSnapshot(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async loadLatestSnapshot(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        throw new Error("Method not implemented.");
    }

}