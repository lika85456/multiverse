import {
    cp, mkdir, readdir,
    rm
} from "fs/promises";
import type { Snapshot } from ".";
import type SnapshotStorage from ".";

export default class LocalSnapshotStorage implements SnapshotStorage {

    constructor(private databaseName: string, private path = "/tmp/snapshots") {

    }

    public async create(filePath: string, timestamp: number): Promise<Snapshot> {
        // create if not exists the folder for the index
        await mkdir(`${this.path}/${this.databaseName}`, { recursive: true });

        await cp(filePath, `${this.path}/${this.databaseName}/${timestamp}.snapshot`);

        return {
            filePath: `${this.path}/${this.databaseName}/${timestamp}.snapshot`,
            timestamp: timestamp,
            databaseName: this.databaseName
        };
    }

    public async loadLatest(): Promise<Snapshot | undefined> {

        try {
            const files = await readdir(`${this.path}/${this.databaseName}`).catch(() => []);

            if (files.length === 0) {
                return undefined;
            }

            const snapshots: Snapshot[] = [];

            for (const file of files) {
                const filePath = `${this.path}/${this.databaseName}/${file}`;

                const timestamp = +file.split(".")[0];

                snapshots.push({
                    filePath,
                    timestamp,
                    databaseName: this.databaseName
                });
            }

            // sort by timestamp
            snapshots.sort((a, b) => a.timestamp - b.timestamp);

            // return the latest
            return snapshots[snapshots.length - 1];
        } catch (e: any) {
            if (e.code === "ENOENT") {
                return undefined;
            }

            throw e;
        }
    }

    public async directoryPath(): Promise<string> {
        return `${this.path}/${this.databaseName}`;
    }

    public async deploy(): Promise<void> {
        await mkdir(this.path, { recursive: true });
    }

    public async destroy(): Promise<void> {
        // delete the folder
        await rm(this.path, { recursive: true });
    }
}