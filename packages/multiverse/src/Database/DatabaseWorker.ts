import type ChangesStorage from "../ChangesStorage";
import type Index from "../Index";
import type { DatabaseConfiguration } from "../DatabaseConfiguration";
import type SnapshotStorage from "../SnapshotStorage";
import type {
    DatabaseClientState, DatabaseQuery, DatabaseQueryResult
} from "./DatabaseClient";
import type DatabaseClient from "./DatabaseClient";
import os from "node-os-utils";
import fs from "fs/promises";
import log from "@multiverse/log";

export default class DatabaseWorker implements DatabaseClient {

    private instanceId = Math.random().toString(36).slice(2);
    private lastUpdate = 0;

    constructor(private options: {
        config: IndexConfiguration,
        snapshotStorage: SnapshotStorage,
        changesStorage: ChangesStorage,
        index: Index,
        memoryLimit: number,
        ephemeralLimit: number,
    }) {
    }

    private async directorySize(path: string): Promise<number> {
        const files = await fs.readdir(path);
        let size = 0;

        for (const file of files) {
            const stats = await fs.stat(`${path}/${file}`);

            if (stats.isDirectory()) {
                size += await this.directorySize(`${path}/${file}`);
            } else {
                size += stats.size;
            }
        }

        return size / 1024 / 1024;
    }

    public async state(): Promise<DatabaseClientState> {
        return {
            instanceId: this.instanceId,
            lastUpdate: this.lastUpdate,
            memoryUsed: (await os.mem.used()).usedMemMb,
            memoryLimit: this.options.memoryLimit,
            ephemeralUsed: -1, // TODO implement
            ephemeralLimit: this.options.ephemeralLimit
        };
    }

    public async query(query: DatabaseQuery): Promise<DatabaseQueryResult> {
        if (query.updates) {
            for (const update of query.updates) {
                if (update.timestamp < this.lastUpdate) {
                    continue;
                }

                if (update.action === "add") {
                    await this.options.index.add([update.vector]);
                }

                if (update.action === "remove") {
                    await this.options.index.remove([update.label]);
                }
            }
        }

        const result = await this.options.index.knn(query.query);

        return {
            result: { result },
            state: await this.state()
        };
    }

    public async wake(wait: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, wait));
    }

    public async saveSnapshot(): Promise<void> {
        const randomId = Math.random().toString(36).slice(2);
        const path = `/tmp/${randomId}`;
        await this.options.index.save(path);

        const snapshot = await this.options.snapshotStorage.create(path);

        log.debug(`Saved snapshot ${snapshot.filePath}`, { snapshot });
    }

    public async loadLatestSnapshot(): Promise<void> {
        const snapshot = await this.options.snapshotStorage.loadLatest();

        if (!snapshot) {
            return;
        }

        await this.options.index.load(snapshot.filePath);

        log.debug(`Loaded snapshot ${snapshot.filePath}`, { snapshot });
    }

    public async count(): Promise<{
        vectors: number,
        vectorDimensions: number
    }> {
        return { // TODO: implement properly
            vectors: await this.options.index.size(),
            vectorDimensions: await this.options.index.dimensions()
        };
    }
}