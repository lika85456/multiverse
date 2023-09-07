import {
    cp, mkdir, readdir
} from "fs/promises";
import type { Snapshot } from ".";
import type SnapshotStorage from ".";

export default class LocalSnapshotStorage implements SnapshotStorage {

    constructor(private indexName: string, private path = "/tmp/snapshots") {

    }

    public async create(filePath: string): Promise<Snapshot> {
        // create if not exists the folder for the index
        await mkdir(`${this.path}/${this.indexName}`, { recursive: true });

        const now = Date.now();

        await cp(filePath, `${this.path}/${this.indexName}/${now}.snapshot`);

        return {
            filePath: `${this.path}/${this.indexName}/${now}.snapshot`,
            timestamp: now,
            indexName: this.indexName
        };
    }

    public async loadLatest(): Promise<Snapshot | undefined> {

        const files = await readdir(`${this.path}/${this.indexName}`);

        if (files.length === 0) {
            return undefined;
        }

        const snapshots: Snapshot[] = [];

        for (const file of files) {
            const filePath = `${this.path}/${this.indexName}/${file}`;

            const timestamp = +file.split(".")[0];

            snapshots.push({
                filePath,
                timestamp,
                indexName: this.indexName
            });
        }

        // sort by timestamp
        snapshots.sort((a, b) => a.timestamp - b.timestamp);

        // return the latest
        return snapshots[snapshots.length - 1];
    }

    public async directoryPath(): Promise<string> {
        return `${this.path}/${this.indexName}`;
    }
}