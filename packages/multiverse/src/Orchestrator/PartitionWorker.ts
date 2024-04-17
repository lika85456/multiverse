import type {
    CountResponse,
    StatefulResponse,
    Worker, WorkerQuery, WorkerQueryResult
} from "../Compute/Worker";
import type { Region } from "../core/DatabaseConfiguration";
import type { PartitionInfrastructureState, PartitionLambdaState } from "../InfrastructureStorage";
import type InfrastructureStorage from "../InfrastructureStorage";
import LambdaWorker from "../Compute/LambdaWorker";
import logger from "@multiverse/log";
import type { StoredVectorChange } from "../ChangesStorage/StoredVector";

const log = logger.getSubLogger({ name: "PartitionWorker" });

/**
 * Because workers need to be available at all times, they have multiple fallback instances that are warmed up periodically.
 *
 * Out of region instances could be possible, but they would be probably very expensive, since S3 transfer between regions is not free.
 */
export default class PartitionWorker implements Worker {

    private infrastructureStorage: InfrastructureStorage;
    private partitionIndex: number;
    private databaseName: string;

    private partition: Promise<PartitionInfrastructureState>;
    private lambdasByPriority: Promise<PartitionLambdaState[]>;

    private REQUEST_TIMEOUT = 2000;

    private lambdaFactory: (name: string, region: Region) => Worker;

    constructor(options: {
        infrastructureStorage: InfrastructureStorage;
        partitionIndex: number;
        databaseName: string;
        lambdaFactory?: (name: string, region: Region) => Worker;
    }) {
        this.partitionIndex = options.partitionIndex;
        this.infrastructureStorage = options.infrastructureStorage;
        this.databaseName = options.databaseName;

        // injected for testing
        this.lambdaFactory = options.lambdaFactory || ((name, region) => new LambdaWorker({
            lambdaName: name,
            region
        }));

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

        this.lambdasByPriority = this.partition.then(partition => {
            const primary = partition.lambda.find(l => l.type === "primary");
            if (!primary) {
                throw new Error("Primary not found");
            }

            const secondaries = partition.lambda.filter(l => l.type === "fallback" && l.region === primary.region);

            const regions = partition.lambda.filter(l => l.region !== primary.region);

            return [primary, ...secondaries, ...regions];
        });
    }

    private async throwOnTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
        // throw if the promise does not resolve in time
        return new Promise<T>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error("Timeout"));
            }, timeout);

            promise
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timeoutId));
        });
    }

    private async request<TEvent extends keyof Worker>(
        event: TEvent,
        payload: Parameters<Worker[TEvent]>
    ): Promise<ReturnType<Worker[TEvent]>> {

        await this.partition;

        for (const lambdaState of await this.lambdasByPriority) {
            try {
                const worker = this.lambdaFactory(lambdaState.name, lambdaState.region);

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const responsePromise = worker[event](...payload) as Promise<ReturnType<Worker[TEvent]>>;

                const response = await this.throwOnTimeout(responsePromise, this.REQUEST_TIMEOUT);

                await this.infrastructureStorage.processState(this.databaseName, response.state);

                return response as ReturnType<Worker[TEvent]>;
            } catch (e) {
                log.debug(`Lambda ${lambdaState.name} failed: ${e}`);
            }
        }

        throw new Error("All lambdas failed");
    }

    public async update(updates: StoredVectorChange[]): Promise<StatefulResponse<void>> {
        return await this.request("update", [updates]);
    }

    public async state(): Promise<StatefulResponse<void>> {
        return await this.request("state", []);
    }

    public async query(query: WorkerQuery): Promise<StatefulResponse<WorkerQueryResult>> {
        return await this.request("query", [query]);
    }

    public async saveSnapshot(): Promise<StatefulResponse<void>> {
        return await this.request("saveSnapshot", []);
    }

    public async loadLatestSnapshot(): Promise<StatefulResponse<void>> {
        return await this.request("loadLatestSnapshot", []);
    }

    public async count(): Promise<StatefulResponse<CountResponse>> {
        return await this.request("count", []);
    }

    // TODO: safely update and wake up all lambdas, so there is no downtime
}