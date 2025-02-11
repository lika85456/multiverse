import type ChangesStorage from "../ChangesStorage";
import LambdaWorker from "../Compute/LambdaWorker";
import type { Worker } from "../Compute/Worker";
import type { AwsToken } from "../core/AwsToken";
import type {
    DatabaseConfiguration, DatabaseID, Region, StoredDatabaseConfiguration, Token
} from "../core/DatabaseConfiguration";
import type { StatisticsEvent } from "../core/Events";
import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";
import LocalIndex from "../Index/LocalIndex";
import type InfrastructureStorage from "../InfrastructureStorage";
import type { Infrastructure } from "../InfrastructureStorage";
import type SnapshotStorage from "../SnapshotStorage";
import SQSSStatisticsQueue from "../StatisticsQueue/SQSStatisticsQueue";
import type Orchestrator from "./Orchestrator";
import PartitionWorker from "./PartitionWorker";
import logger from "@multiverse/log";

const log = logger.getSubLogger({ name: "OrchestratorWorker" });

export default class OrchestratorWorker implements Orchestrator {

    private lambdaFactory: (name: string, region: Region) => Worker;

    private maxChangesCount = 1000;

    constructor(private options: {
        infrastructureStorage: InfrastructureStorage;
        changesStorage: ChangesStorage;
        databaseId: DatabaseID;
        databaseConfiguration: DatabaseConfiguration;
        snapshotStorage: SnapshotStorage;
        awsToken: AwsToken;

        maxChangesCount?: number;
        lambdaFactory?: (name: string, region: Region) => Worker;
    }) {
        this.lambdaFactory = this.options.lambdaFactory ?? ((name, region) => new LambdaWorker({
            lambdaName: name,
            region,
            awsToken: this.options.awsToken,
        }));

        this.maxChangesCount = this.options.maxChangesCount ?? this.maxChangesCount ?? 1000;
    }

    public async ping(wait?: number) {
        if (wait) {
            await new Promise(resolve => setTimeout(resolve, wait));
        }

        return "pong";
    }

    /**
     * Initialization is called on every orchestrator instance (to handle cache etc.)
     * Dont wake up workers here for the first time, they will get woken up by the deployer
     */
    public async initialize() {
        // check if infrastructure meets scaling quotas, if not, scale up
        // log.info("Initializing orchestrator worker");
        // const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        // if (!infrastructure) {
        //     throw new Error(`Database ${this.options.databaseId.name} not found`);
        // }

        // // check if infrastructure contains at least 10 minute old instances
        // const workersInstantiated = infrastructure
        //     .partitions.some(partition => partition
        //         .lambda.some(lambda => lambda
        //             .instances.some(instance => instance.lastUpdated < Date.now() - 1000 * 60 * 10)));

        // // todo implement partitions
        // if (!workersInstantiated) {
        //     const workers = await this.getWorkers(infrastructure);

        //     // wake up workers
        //     for (let i = 0;i < 3;i++) {
        //         try {
        //             await Promise.all(Object.values(workers).map(worker => worker.requestAll("loadLatestSnapshot", [], "all", infrastructure.scalingTargetConfiguration)));
        //         } catch (e) {
        //             log.error("Error while waking up workers. But continuing", { error: e });
        //         }
        //     }
        // }

        // log.info("Orchestrator worker (and compute workers) initialized");
    }

    public async wakeUpWorkers(tries = 0): Promise<void> {
        log.info("Waking up workers");

        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        const workers = await this.getWorkers(infrastructure);

        try {
            await Promise.all(Object.values(workers).map(worker => worker.requestAll("loadLatestSnapshot", [], "all", infrastructure.scalingTargetConfiguration)));
        } catch (e) {
            log.error("Error while waking up workers.", { error: e });

            if (tries > 3) {
                throw e;
            }

            log.info(`Retrying waking up workers. Try ${tries + 1}`);
            await new Promise(resolve => setTimeout(resolve, 5000));

            return this.wakeUpWorkers(tries + 1);
        }

        log.info("Workers woken up");
    }

    private async getWorkers(infrastructure: Infrastructure): Promise<{[partitionIndex: number]: PartitionWorker}> {
        // for every partition
        const workers: {[partitionIndex: number]: PartitionWorker} = {};

        for (const partition of infrastructure.partitions) {
            workers[partition.partitionIndex] = new PartitionWorker({
                infrastructureStorage: this.options.infrastructureStorage,
                partitionIndex: partition.partitionIndex,
                databaseName: this.options.databaseId.name,
                lambdaFactory: this.lambdaFactory,
                awsToken: this.options.awsToken,
            });
        }

        return workers;
    }

    public async query(query: Query): Promise<QueryResult> {
        log.info("Starting query");
        const startTimestamp = Date.now();

        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);
        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }
        log.info(`Getting infrastructure took ${Date.now() - startTimestamp} ms`);

        const workers = await this.getWorkers(infrastructure);

        // TODO: implement partition

        if (Object.entries(workers).length > 1) {
            throw new Error("Only one partition is supported");
        }

        const worker = Object.entries(workers)[0];

        const [
            oldestUpdateTimestamp,
            latestSnapshot
        ] = await Promise.all([
            this.options.infrastructureStorage.getOldestUpdateTimestamp(infrastructure, parseInt(worker[0])),
            this.options.snapshotStorage.latestWithoutDownload()
        ]);

        const resultWorkerQueryResult = worker[1].query({
            query,
            updateSnapshotIfOlderThan: latestSnapshot?.timestamp ?? 0
        });

        log.info("Starting to query a worker and load updates after oldest timestamp");
        const workerQueryStart = Date.now();
        const [
            result,
            updates
        ] = await Promise.all([
            resultWorkerQueryResult.then(res => {
                log.info(`Querying worker took ${Date.now() - workerQueryStart} ms`);

                return res;
            }),
            this.options.changesStorage.getAllChangesAfter(oldestUpdateTimestamp).then(changes => {
                log.info(`Getting updates took ${Date.now() - workerQueryStart} ms`);

                return changes;
            })
        ]);

        log.info(`Got ${updates.length} updates. Merging now`);
        // todo merge result + updates
        const resultLatestSnapshotTimestamp = result.state.lastUpdate;
        const updatesThatResultNeeds = updates.filter(update => update.timestamp >= resultLatestSnapshotTimestamp);

        const index = new LocalIndex({
            dimensions: this.options.databaseConfiguration.dimensions,
            space: this.options.databaseConfiguration.space,
        });

        // add updates
        for (const update of updatesThatResultNeeds) {
            if (update.action === "add") {
                await index.add([update.vector]);
            } else if (update.action === "remove") {
                await index.remove([update.label]);
            }
        }

        const localQueryResult = await index.knn(query);

        const mergedResult = [...result.result.result, ...localQueryResult];

        const finalResult = {
            result: mergedResult
                .sort((a, b) => a.distance - b.distance)
                .slice(0, query.k)
        };

        const endTimestamp = Date.now();

        await this.safelySendStatisticsEvent({
            dbName: this.options.databaseId.name,
            type: "query",
            duration: endTimestamp - startTimestamp,
            timestamp: startTimestamp
        });

        log.info(`Query took ${endTimestamp - startTimestamp} ms`);

        return finalResult;
    }

    private async flushChangesStorage() {
        // THIS SHOULD BE LOCKED and done only once if needed
        log.info("Flushing changes storage");

        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);
        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }
        log.info("Got infrastructure");

        if (infrastructure.flushing) {
            log.info("Already flushing");

            return;
        }

        await this.options.infrastructureStorage.setProperty(this.options.databaseId.name, "flushing", true);

        let error;
        try {
            const workers = await this.getWorkers(infrastructure);
            const worker = Object.entries(workers)[0][1];

            const savingTime = Date.now();
            log.info("Saving snapshot with updates");
            const { result: { changesFlushed } } = await worker.saveSnapshotWithUpdates();

            // todo racing conditions... lock this somehow
            await Promise.allSettled([
                worker.requestAll("loadLatestSnapshot", [], "all", infrastructure.scalingTargetConfiguration),
                this.options.infrastructureStorage.addStoredChanges(this.options.databaseId.name, -changesFlushed),
                this.options.changesStorage.clearBefore(savingTime),
            ]);

            // TODO: implement partition

            if (Object.entries(workers).length > 1) {
                throw new Error("Only one partition is supported");
            }

            log.info("Flushed changes storage");
        } catch (e) {
            log.error("Error while flushing changes storage", { error: e });
            error = e;
        } finally {
            await this.options.infrastructureStorage.setProperty(this.options.databaseId.name, "flushing", false);
        }

        if (error) {
            throw error;
        }
    }

    private shouldFlush(changesStored: number) {
        if (changesStored * this.options.databaseConfiguration.dimensions > 100_000 || changesStored > this.maxChangesCount) {
            return true;
        }

        return false;
    }

    public async addVectors(vectors: NewVector[]): Promise<{unprocessedItems: string[]}> {
        let count = 0;
        let result: any;

        try {
            log.info("Adding vectors to changes storage", { vectors: vectors.length });
            result = await this.options.changesStorage.add(vectors.map(vector => ({
                action: "add",
                timestamp: Date.now(),
                vector
            })));
            log.info("Added vectors", { vectors: vectors.length });

            log.info("Updating infrastructure storage");
            count = await this.options.infrastructureStorage.addStoredChanges(this.options.databaseId.name, vectors.length);
            log.info("Updated infrastructure storage");

            log.info(`Flush count: ${count} -> condition: ${this.shouldFlush(count)}`);
            if (this.shouldFlush(count)) {
                await this.flushChangesStorage();
            }

        } catch (e) {
            // revert changes
            log.error("Error while adding vectors", { error: e });

            if (!result) {
                throw e;
            }

            // TODO: revert changes

            await this.options.changesStorage.add(vectors.map(vector => ({
                action: "remove",
                timestamp: Date.now(),
                label: vector.label
            })));

            if (count !== 0 && vectors.length > 0) {
                await this.options.infrastructureStorage.addStoredChanges(this.options.databaseId.name, -vectors.length);
            }
        }

        await this.safelySendStatisticsEvent({
            type: "add",
            count: vectors.length,
            dbName: this.options.databaseId.name,
            timestamp: Date.now(),
            vectorsAfter: count,
            dataSize: -1
        });

        return result;
    }

    public async removeVectors(labels: string[]): Promise<{unprocessedItems: string[]}> {
        let count = 0;
        let result: any;

        try {
            log.info("Removing vectors from changes storage", { vectors: labels.length });
            result = await this.options.changesStorage.add(labels.map(label => ({
                action: "remove",
                timestamp: Date.now(),
                label
            })));
            log.info("Removed vectors", { vectors: labels.length });

            log.info("Updating infrastructure storage");
            count = await this.options.infrastructureStorage.addStoredChanges(this.options.databaseId.name, labels.length);
            log.info("Updated infrastructure storage");

            log.info(`Flush count: ${count} -> condition: ${this.shouldFlush(count)}`);
            if (this.shouldFlush(count)) {
                await this.flushChangesStorage();
            }

        } catch (e) {
            // revert changes
            log.error("Error while removing vectors", { error: e });

            throw e;

            // TODO: revert changes
        }

        await this.safelySendStatisticsEvent({
            type: "remove",
            count: labels.length,
            dbName: this.options.databaseId.name,
            timestamp: Date.now(),
            vectorsAfter: count,
            dataSize: -1
        });

        return result;
    }

    public async getConfiguration(): Promise<StoredDatabaseConfiguration> {
        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        return infrastructure?.configuration;
    }

    public async addToken(token: Token): Promise<void> {
        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        const tokens: Token[] = infrastructure.configuration.secretTokens;

        if (tokens.some(t => t.name === token.name)) {
            throw new Error("Token with this name already exists");
        }

        tokens.push(token);

        await this.options.infrastructureStorage.setProperty(this.options.databaseId.name, "configuration", {
            ...infrastructure.configuration,
            secretTokens: tokens
        });
    }

    public async removeToken(tokenName: string): Promise<void> {
        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        const tokens: Token[] = infrastructure.configuration.secretTokens;

        const index = tokens.findIndex(t => t.name === tokenName);

        if (index === -1) {
            throw new Error("Token not found");
        }

        tokens.splice(index, 1);

        await this.options.infrastructureStorage.setProperty(this.options.databaseId.name, "configuration", {
            ...infrastructure.configuration,
            secretTokens: tokens
        });
    }

    public async auth(secret: string): Promise<boolean> {
        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        return infrastructure.configuration.secretTokens.some(t =>
            t.secret === secret
            && t.validUntil > Date.now());
    }

    private async safelySendStatisticsEvent(e: StatisticsEvent) {
        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        if (!infrastructure.configuration.statisticsQueueName) {
            return;
        }

        const q = new SQSSStatisticsQueue({
            queueUrl: infrastructure.configuration.statisticsQueueName,
            region: this.options.databaseId.region,
            awsToken: this.options.awsToken
        });

        await q.push(e);
    }
}