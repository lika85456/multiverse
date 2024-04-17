import { z } from "zod";
import type { WorkerState } from "../Compute/Worker";
import type {
    DatabaseConfiguration, DatabaseID, Region
} from "../core/DatabaseConfiguration";

export type PartitionLambdaState = {
    name: string;
    region: Region;
    type: "primary" | "fallback";
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
    configuration: DatabaseConfiguration;
    scalingTargetConfiguration: ScalingTargetConfiguration;

    /**
     * each partition has multiple compute instances
     */
    partitions: PartitionInfrastructureState[];
};

export default abstract class InfrastructureStorage {
    abstract set(dbName: string, infrastructure: Infrastructure): Promise<void>;
    abstract get(dbName: string): Promise<Infrastructure | undefined>;
    abstract remove(dbName: string): Promise<void>;
    abstract list(): Promise<Infrastructure[]>;

    abstract deploy(): Promise<void>;
    abstract destroy(): Promise<void>;

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

    async processState(dbName: string, lambdaName: string, state: WorkerState) {
        const infrastructure = await this.get(dbName);
        if (!infrastructure) {
            throw new Error(`Database ${dbName} not found`);
        }

        const partition = infrastructure.partitions.find(p => p.partitionIndex === state.partitionIndex);
        if (!partition) {
            throw new Error(`Partition not found for instance ${state.instanceId}`);
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
}