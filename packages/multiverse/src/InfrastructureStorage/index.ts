import { z } from "zod";
import type { WorkerState } from "../Compute/Worker";
import type {
    DatabaseID, Region,
    StoredDatabaseConfiguration
} from "../core/DatabaseConfiguration";
import logger from "@multiverse/log";

const log = logger.getSubLogger({ name: "InfrastructureStorage" });

export type PartitionLambdaState = {
    name: string;
    region: Region;
    type: "primary" | "secondary" | "fallback";
    wakeUpInstances: number;
    instances: {
        id: string;
        lastUpdated: number; // 0 means its not updated
    }[]
};

export type PartitionInfrastructureState = {
    partitionIndex: number;
    lambda: PartitionLambdaState[];
};

export const scalingTargetConfiguration = z.object({
    warmPrimaryInstances: z.number().positive().max(10000),
    warmSecondaryInstances: z.number().positive().max(10000),
    warmRegionalInstances: z.number().positive().max(10000),

    secondaryFallbacks: z.number().positive().max(10000), // fallback in the same region
    outOfRegionFallbacks: z.number().positive().max(10000), // fallback in other regions
});

export type ScalingTargetConfiguration = z.infer<typeof scalingTargetConfiguration>;

export type Infrastructure = {
    databaseId: DatabaseID;
    configuration: StoredDatabaseConfiguration;
    scalingTargetConfiguration: ScalingTargetConfiguration;

    /**
     * each partition has multiple compute instances
     */
    partitions: PartitionInfrastructureState[];

    storedChanges: number;
    flushing: boolean;
};

// TODO: RACING CONDITION!!!

export default abstract class InfrastructureStorage {
    abstract set(dbName: string, infrastructure: Infrastructure): Promise<void>;
    abstract setProperty<T extends keyof Infrastructure>(dbName: string, property: T, value: Infrastructure[T]): Promise<void>;
    abstract get(dbName: string): Promise<Infrastructure | undefined>;
    abstract remove(dbName: string): Promise<void>;
    abstract list(): Promise<Infrastructure[]>;

    abstract deploy(): Promise<void>;
    abstract destroy(): Promise<void>;
    abstract exists(): Promise<boolean>;

    abstract addStoredChanges(dbName: string, changesCount: number): Promise<number>;
    abstract setStoredChanges(dbName: string, changesCount: number): Promise<void>;
    abstract getStoredChanges(dbName: string): Promise<number>;

    abstract getResourceName(): string;

    private trimOldInstances(infrastructure: Infrastructure) {
        const now = Date.now();
        for (const partition of infrastructure.partitions) {
            for (const lambda of partition.lambda) {
                // filter out instances that are older than 1 hour
                lambda.instances = lambda.instances.filter(i => now - i.lastUpdated < 1000 * 60 * 60);

                // and filter out instances that are the oldest and are out of the limit of warm instances
                // lambda.instances = lambda.instances.sort((a, b) => a.lastUpdated - b.lastUpdated);
                // maybe don't filter out these instances, so there is more "free" capacity
            }
        }
    }

    public async processState(dbName: string, lambdaName: string, state: WorkerState) {
        log.debug("Processing state", {
            dbName,
            lambdaName,
            state
        });

        const infrastructure = await this.get(dbName);
        if (!infrastructure) {
            throw new Error(`Database ${dbName} not found`);
        }

        // @ts-ignore
        if (infrastructure.partitions.includes(undefined)) {
            log.warn("Partitions include undefined", {
                dbName,
                lambdaName,
                state,
                infrastructure
            });
        }

        const partition = infrastructure.partitions.find(p => p?.partitionIndex === state.partitionIndex);
        if (!partition) {
            throw new Error(`Partition ${state.partitionIndex} not found for instance ${state.instanceId} in infrastructure: ${JSON.stringify(infrastructure)}`);
        }

        const lambda = partition.lambda.find(l => l.name === lambdaName);
        if (!lambda) {
            throw new Error(`Lambda ${lambdaName} not found`);
        }

        const instance = lambda.instances.find(i => i.id === state.instanceId);
        if (!instance) {
            lambda.instances.push({
                id: state.instanceId,
                lastUpdated: state.lastUpdate
            });
        } else {
            instance.lastUpdated = state.lastUpdate;
        }

        // TODO store usage event?

        this.trimOldInstances(infrastructure);

        await this.set(dbName, infrastructure);
    }

    public async getOldestUpdateTimestamp(infrastructure: Infrastructure, partitionIndex: number): Promise<number> {
        const partition = infrastructure.partitions.find(p => p.partitionIndex === partitionIndex);
        if (!partition) {
            throw new Error(`Partition ${partitionIndex} not found`);
        }

        let oldest = Infinity;
        for (const lambda of partition.lambda) {
            for (const instance of lambda.instances) {
                if (instance.lastUpdated < oldest && instance.lastUpdated !== 0) {
                    oldest = instance.lastUpdated;
                }
            }
        }

        if (oldest === Infinity) {
            return 0;
        }

        return oldest;
    }
}