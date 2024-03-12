export type Snapshot = {
    filePath: string;
    timestamp: number;
    databaseName: string;
};

export default interface SnapshotStorage {
    create(filePath: string): Promise<Snapshot>;
    loadLatest(): Promise<Snapshot | undefined>;
    directoryPath(): Promise<string>;

    deploy(): Promise<void>;
}