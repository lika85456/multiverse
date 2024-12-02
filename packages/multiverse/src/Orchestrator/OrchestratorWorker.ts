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
            awsToken: this.options.awsToken
        }));

        this.maxChangesCount = this.options.maxChangesCount ?? this.maxChangesCount ?? 1000;
    }

    /**
     * Initialize should be called if new instance is created (once per orchestrator lifecycle)
     */
    public async initialize() {
        // check if infrastructure meets scaling quotas, if not, scale up
        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);

        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        // todo implement partitions
        const workers = await this.getWorkers(infrastructure);

        for (const worker of Object.values(workers)) {
            await worker.requestAll("loadLatestSnapshot", [], "all", infrastructure.scalingTargetConfiguration);
        }
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
        const startTimestamp = Date.now();

        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);
        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        const workers = await this.getWorkers(infrastructure);

        // TODO: implement partition

        if (Object.entries(workers).length > 1) {
            throw new Error("Only one partition is supported");
        }

        const worker = Object.entries(workers)[0];

        const oldestUpdateTimestamp = await this.options.infrastructureStorage.getOldestUpdateTimestamp(
            infrastructure,
            parseInt(worker[0])
        );

        let updates = await this.options.changesStorage.getAllChangesAfter(oldestUpdateTimestamp);

        const latestSnapshot = await this.options.snapshotStorage.latestWithoutDownload();

        const updatesVectorDimensions = updates.length * this.options.databaseConfiguration.dimensions;

        // TODO: this is a last resort, this should not happen
        if (updatesVectorDimensions > 250_000) {
            await this.flushChangesStorage();
            updates = [];
        }

        const result = await worker[1].query({
            query,
            updates,
            updateSnapshotIfOlderThan: latestSnapshot?.timestamp ?? 0
        });
        // TODO! merge result with updates!!!!!!§

        log.debug("Querying", {
            infrastructure,
            oldestUpdateTimestamp,
            updates,
            result
        });

        const endTimestamp = Date.now();

        await this.safelySendStatisticsEvent({
            dbName: this.options.databaseId.name,
            type: "query",
            duration: endTimestamp - startTimestamp,
            timestamp: startTimestamp
        });

        return result.result;
    }

    private async flushChangesStorage() {
        // THIS SHOULD BE LOCKED and done only once if needed
        log.debug("Flushing changes storage");

        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);
        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }
        const workers = await this.getWorkers(infrastructure);
        const worker = Object.entries(workers)[0][1];

        await worker.saveSnapshotWithUpdates();

        await this.options.changesStorage.clearBefore(Number.MAX_SAFE_INTEGER / 1000);

        // TODO: implement partition

        if (Object.entries(workers).length > 1) {
            throw new Error("Only one partition is supported");
        }

        await worker.requestAll("loadLatestSnapshot", [], "all", infrastructure.scalingTargetConfiguration);
    }

    private shouldFlush(changesStored: number) {
        if (changesStored * this.options.databaseConfiguration.dimensions > 100_000 || changesStored > this.maxChangesCount) {
            return true;
        }

        return false;
    }

    public async addVectors(vectors: NewVector[]): Promise<{unprocessedItems: string[]}> {
        const result = await this.options.changesStorage.add(vectors.map(vector => ({
            action: "add",
            timestamp: Date.now(),
            vector
        })));

        await this.options.infrastructureStorage.addStoredChanges(this.options.databaseId.name, vectors.length);
        // TODOO optimize this
        const count = await this.options.infrastructureStorage.getStoredChanges(this.options.databaseId.name);

        await this.safelySendStatisticsEvent({
            type: "add",
            count: vectors.length,
            dbName: this.options.databaseId.name,
            timestamp: Date.now(),
            vectorsAfter: count,
            dataSize: -1
        });

        if (this.shouldFlush(count)) {
            await this.flushChangesStorage();
        }

        return result;
    }

    public async removeVectors(labels: string[]): Promise<{unprocessedItems: string[]}> {
        const result = await this.options.changesStorage.add(labels.map(label => ({
            action: "remove",
            timestamp: Date.now(),
            label
        })));

        await this.options.infrastructureStorage.addStoredChanges(this.options.databaseId.name, labels.length);
        // TODOO optimize this
        const count = await this.options.infrastructureStorage.getStoredChanges(this.options.databaseId.name);

        await this.safelySendStatisticsEvent({
            type: "remove",
            count: labels.length,
            dbName: this.options.databaseId.name,
            timestamp: Date.now(),
            vectorsAfter: count,
            dataSize: -1
        });

        if (this.shouldFlush(count)) {
            await this.flushChangesStorage();
        }

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