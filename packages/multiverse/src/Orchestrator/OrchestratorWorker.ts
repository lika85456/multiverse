import type ChangesStorage from "../ChangesStorage";
import LambdaWorker from "../Compute/LambdaWorker";
import type { Worker } from "../Compute/Worker";
import type {
    DatabaseConfiguration, DatabaseID, Region, Token
} from "../core/DatabaseConfiguration";
import type { Query, QueryResult } from "../core/Query";
import type { NewVector } from "../core/Vector";
import type InfrastructureStorage from "../InfrastructureStorage";
import type { Infrastructure } from "../InfrastructureStorage";
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

        maxChangesCount?: number;
        lambdaFactory?: (name: string, region: Region) => Worker;
    }) {
        this.lambdaFactory = this.options.lambdaFactory ?? ((name, region) => new LambdaWorker({
            lambdaName: name,
            region
        }));

        this.maxChangesCount = this.options.maxChangesCount ?? this.maxChangesCount;
    }

    private async getWorkers(infrastructure: Infrastructure): Promise<{[partitionIndex: number]: PartitionWorker}> {
        // for every partition
        const workers: {[partitionIndex: number]: PartitionWorker} = {};

        for (const partition of infrastructure.partitions) {
            workers[partition.partitionIndex] = new PartitionWorker({
                infrastructureStorage: this.options.infrastructureStorage,
                partitionIndex: partition.partitionIndex,
                databaseName: this.options.databaseId.name,
                lambdaFactory: this.lambdaFactory
            });
        }

        return workers;
    }

    public async query(query: Query): Promise<QueryResult> {
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

        const updates = await this.options.changesStorage.getAllChangesAfter(oldestUpdateTimestamp);

        const result = await worker[1].query({
            query,
            updates
        });

        // TODO! merge result with updates!!!!!!§

        log.debug("Querying", {
            infrastructure,
            workers,
            oldestUpdateTimestamp,
            updates,
            result
        });

        return result.result;
    }

    private async flushChangesStorage() {
        log.debug("Flushing changes storage");

        const changes = await this.options.changesStorage.getAllChangesAfter(0);
        await this.options.changesStorage.clearBefore(Infinity);

        const infrastructure = await this.options.infrastructureStorage.get(this.options.databaseId.name);
        if (!infrastructure) {
            throw new Error(`Database ${this.options.databaseId.name} not found`);
        }

        const workers = await this.getWorkers(infrastructure);

        // TODO: implement partition

        if (Object.entries(workers).length > 1) {
            throw new Error("Only one partition is supported");
        }

        const worker = Object.entries(workers)[0][1];

        await worker.saveSnapshotWithUpdates(changes);

        await worker.requestAll("loadLatestSnapshot", [], "all");
    }

    public async addVectors(vectors: NewVector[]): Promise<void> {
        await this.options.changesStorage.add(vectors.map(vector => ({
            action: "add",
            timestamp: Date.now(),
            vector
        })));

        const count = await this.options.changesStorage.count();

        if (count > this.maxChangesCount) {
            await this.flushChangesStorage();
        }
    }

    public async removeVectors(labels: string[]): Promise<void> {
        await this.options.changesStorage.add(labels.map(label => ({
            action: "remove",
            timestamp: Date.now(),
            label
        })));

        const count = await this.options.changesStorage.count();

        if (count > this.maxChangesCount) {
            await this.flushChangesStorage();
        }
    }

    public async getConfiguration(): Promise<DatabaseConfiguration> {
        return this.options.databaseConfiguration;
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
}