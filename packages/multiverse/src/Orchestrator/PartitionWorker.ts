import type {
    CountResponse,
    StatefulResponse,
    Worker, WorkerQuery, WorkerQueryResult
} from "../Compute/Worker";
import type { Region } from "../core/DatabaseConfiguration";
import type {
    Infrastructure, PartitionInfrastructureState, PartitionLambdaState,
    ScalingTargetConfiguration
} from "../InfrastructureStorage";
import type InfrastructureStorage from "../InfrastructureStorage";
import LambdaWorker from "../Compute/LambdaWorker";
import logger from "@multiverse/log";
import type { StoredVectorChange } from "../ChangesStorage/StoredVector";
import type { AwsToken } from "../core/AwsToken";

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
    private REQUEST_ALL_WAIT_TIME = 2000;

    private lambdaFactory: (name: string, region: Region, waitTime: number) => Worker;

    constructor(options: {
        infrastructureStorage: InfrastructureStorage;
        partitionIndex: number;
        databaseName: string;
        awsToken: AwsToken;

        lambdaFactory?: (name: string, region: Region, waitTime: number) => Worker;
        infrastructure?: Infrastructure;
    }) {
        this.partitionIndex = options.partitionIndex;
        this.infrastructureStorage = options.infrastructureStorage;
        this.databaseName = options.databaseName;

        // injected for testing
        this.lambdaFactory = options.lambdaFactory || ((name, region) => new LambdaWorker({
            lambdaName: name,
            region,
            awsToken: options.awsToken
        }));

        this.partition = (
            options.infrastructure
                ? Promise.resolve(options.infrastructure)
                : this.infrastructureStorage.get(options.databaseName)
        )
            .then(infrastructure => {
                if (!infrastructure) {
                    throw new Error(`Database ${options.databaseName} not found`);
                }

                const partition = infrastructure.partitions.find(p => p.partitionIndex === options.partitionIndex);
                if (!partition) {
                    throw new Error(`Partition ${options.partitionIndex} not found`);
                }

                return partition;
            });

        this.lambdasByPriority = this.partition
            .then(partition => {
                const primary = partition.lambda.find(l => l.type === "primary");
                if (!primary) {
                    throw new Error("Primary not found");
                }

                const secondaries = partition.lambda.filter(l => l.type === "secondary");

                const regions = partition.lambda.filter(l => l.type === "fallback");

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

    // TODO: this is a naive implementation and could be very much improved
    private async request<TEvent extends keyof Worker>(
        event: TEvent,
        payload: Parameters<Worker[TEvent]>
    ): Promise<ReturnType<Worker[TEvent]>> {

        await this.partition;
        const errors = [];

        log.debug("Trying lambdas by priority: ", await this.lambdasByPriority);

        for (const lambdaState of await this.lambdasByPriority) {
            try {
                const worker = this.lambdaFactory(lambdaState.name, lambdaState.region, 0);

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const responsePromise = worker[event](...payload) as Promise<ReturnType<Worker[TEvent]>>;

                const response = await this.throwOnTimeout(responsePromise, this.REQUEST_TIMEOUT);

                await this.infrastructureStorage.processState(this.databaseName, lambdaState.name, response.state);

                return response as ReturnType<Worker[TEvent]>;
            } catch (e) {
                log.debug(`Lambda ${lambdaState.name} failed: ${e}`);
                errors.push({
                    lambda: lambdaState.name,
                    error: e
                });
            }
        }

        throw new Error(`All lambdas failed: ${JSON.stringify(errors)}`);
    }

    /**
     * This function will call all instances of a certain type lambda in a partition based on given scaling target.
     * It does process state of the instances that responded.
     *
     * Total timeout for this method is 5x the timeout of a REQUEST_ALL_WAIT_TIME
     */
    public async requestAll<TEvent extends keyof Worker>(
        event: TEvent,
        payload: Parameters<Worker[TEvent]>,
        lambdaType: "primary" | "fallback" | "all",
        scalingTarget: ScalingTargetConfiguration
    ): Promise<Awaited<ReturnType<Worker[TEvent]>[]>> {

        await this.partition;

        // find lambdas of the type
        const lambdas = await this.lambdasByPriority;
        const lambdasByType = lambdas.filter(l => lambdaType === "all" || l.type === lambdaType);

        const results: {
            result: Awaited<ReturnType<Worker[TEvent]>>;
            lambdaName: string;
        }[] = [];

        const responsePromises = lambdasByType.map(lambdaState => {
            const worker = this.lambdaFactory(lambdaState.name, lambdaState.region, this.REQUEST_ALL_WAIT_TIME);

            const warmInstances = lambdaState.type === "primary"
                ? scalingTarget.warmPrimaryInstances
                : lambdaState.type === "secondary"
                    ? scalingTarget.warmSecondaryInstances
                    : scalingTarget.warmRegionalInstances;

            return Array.from({ length: warmInstances }, () => ({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                result: worker[event](...payload) as Promise<Awaited<ReturnType<Worker[TEvent]>>>,
                lambdaName: lambdaState.name
            }));
        })
            .flat()
            .map(promise => promise.result.then(result => {
                results.push({
                    result,
                    lambdaName: promise.lambdaName
                });
            }));

        // promise all but throw on timeout
        await this.throwOnTimeout(Promise.allSettled(responsePromises), this.REQUEST_ALL_WAIT_TIME * 5).catch();

        // parse states
        // TODO: parse states asynchronously
        await Promise.all(results.map(async result => {
            await this.infrastructureStorage.processState(this.databaseName, result.lambdaName, result.result.state);
        }));

        return results as Array<ReturnType<Worker[TEvent]>>;
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

    public async saveSnapshotWithUpdates(): Promise<StatefulResponse<void>> {
        return await this.request("saveSnapshotWithUpdates", []);
    }

    public async loadLatestSnapshot(): Promise<StatefulResponse<void>> {
        return await this.request("loadLatestSnapshot", []);
    }

    public async count(): Promise<StatefulResponse<CountResponse>> {
        return await this.request("count", []);
    }

    // TODO: safely update and wake up all lambdas, so there is no downtime
}