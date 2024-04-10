import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";

export type PartitionInfrastructureState = {
    partitionIndex: number;
    lambda: {
        name: string;
        region: string;
        type: "primary" | "fallback";
        wakeUpInstances: number;
        instances: {
            id: string;
            lastUpdated: number;
        }[]
    }[]
};

export type Infrastructure = {
    configuration: DatabaseConfiguration;

    /**
     * each partition has multiple compute instances
     */
    partitions: PartitionInfrastructureState[];
};

export default interface InfrastructureStorage {
    set(dbName: string, infrastructure: Infrastructure): Promise<void>;
    get(dbName: string): Promise<Infrastructure | undefined>;
    remove(dbName: string): Promise<void>;
    list(): Promise<Infrastructure[]>;

    deploy(): Promise<void>;
    destroy(): Promise<void>;
}