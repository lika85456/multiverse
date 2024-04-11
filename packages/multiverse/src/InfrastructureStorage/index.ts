import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";

export type Infrastructure = {
    configuration: DatabaseConfiguration;

    /**
     * each partition has multiple compute instances
     */
    partitions: {
        lambda: {
            // physical lambda name so it can be called
            name: string;
            region: string;

            type: "primary" | "fallback";

            wakeUpInstances: number;

            // cache
            instances: {
                id: string;
                lastUpdated: number;
            }[]
        }[]
        partition: number;
    }[];
};

export default interface InfrastructureStorage {
    set(dbName: string, infrastructure: Infrastructure): Promise<void>;
    get(dbName: string): Promise<Infrastructure | undefined>;
    remove(dbName: string): Promise<void>;
    list(): Promise<Infrastructure[]>;

    deploy(): Promise<void>;
    destroy(): Promise<void>;
}