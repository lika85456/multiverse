import type Index from "../Index";
import type SnapshotStorage from "../SnapshotStorage";
import os from "node-os-utils";
import fs from "fs/promises";
import logger from "@multiverse/log";
import type {
    StatefulResponse,
    Worker, WorkerQuery, WorkerQueryResult
} from "./Worker";
import type { StoredVectorChange } from "../ChangesStorage/StoredVector";

export default class ComputeWorker implements Worker {

    private instanceId = Math.random().toString(36).slice(2);
    private lastUpdate = 0;
    private lastSnapshotUpdate = 0;
    private log = logger.getSubLogger({ name: `ComputeWorker-${this.instanceId}` });

    constructor(private options: {
        partitionIndex: number,
        snapshotStorage: SnapshotStorage,
        index: Index,
        memoryLimit: number,
        ephemeralLimit: number,
    }) {
    }

    public async state(): Promise<StatefulResponse<void>> {
        return {
            result: undefined,
            state: {
                instanceId: this.instanceId,
                partitionIndex: this.options.partitionIndex,
                lastUpdate: this.lastUpdate,
                memoryUsed: (await os.mem.used()).usedMemMb,
                memoryLimit: this.options.memoryLimit,
                ephemeralUsed: -1, // TODO implement
                ephemeralLimit: this.options.ephemeralLimit
            }
        };
    }

    public async update(updates: StoredVectorChange[]): Promise<StatefulResponse<void>> {
        for (const update of updates) {
            // some of the updates might have been proccessed already (if lastUpdate===update.timestamp),
            // but if in the right order, it should lead to the same results
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

        // find the latest timestamp
        this.lastUpdate = updates.reduce((max, update) => Math.max(max, update.timestamp), this.lastUpdate);

        return await this.state();
    }

    public async query(query: WorkerQuery): Promise<StatefulResponse<WorkerQueryResult>> {
        if (query.query.k === 0) {
            return {
                ...(await this.state()),
                result: { result: [] }
            };
        }

        if (query.query.k < 0) {
            throw new Error("K must be greater than 0");
        }

        if (query.query.vector.length !== await this.options.index.dimensions()) {
            throw new Error(`Vector dimensions must be ${await this.options.index.dimensions()}`);
        }

        if (query.updateSnapshotIfOlderThan && this.lastSnapshotUpdate < query.updateSnapshotIfOlderThan) {
            await this.loadLatestSnapshot();
        }

        if (query.updates && query.updates.length > 0) {
            await this.update(query.updates);
        }

        const result = await this.options.index.knn(query.query);

        return {
            ...(await this.state()),
            result: { result }
        };
    }

    public async wake(wait: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, wait));
    }

    public async saveSnapshot(): Promise<StatefulResponse<void>> {
        const randomId = Math.random().toString(36).slice(2);
        const path = `/tmp/${randomId}`;
        await this.options.index.save(path);

        const snapshot = await this.options.snapshotStorage.create(path, this.lastUpdate);

        this.log.debug(`Saved snapshot ${snapshot.filePath}`, { snapshot });

        return await this.state();
    }

    public async saveSnapshotWithUpdates(updates: StoredVectorChange[]): Promise<StatefulResponse<void>> {
        await this.update(updates);

        return await this.saveSnapshot();
    }

    public async loadLatestSnapshot(): Promise<StatefulResponse<void>> {
        const snapshot = await this.options.snapshotStorage.loadLatest();

        if (!snapshot) {
            this.log.debug("No snapshot to load");

            return await this.state();
        }

        await this.options.index.load(snapshot.filePath);

        this.lastUpdate = snapshot.timestamp;
        this.lastSnapshotUpdate = snapshot.timestamp;

        this.log.debug(`Loaded snapshot ${snapshot.filePath}`, {
            snapshot,
            totalVectorsLoaded: await this.options.index.count()
        });

        return await this.state();
    }

    public async count(): Promise<StatefulResponse<{
        vectors: number,
        vectorDimensions: number
    }>> {
        return { // TODO: implement properly
            ...(await this.state()),
            result: {
                vectors: await this.options.index.count(),
                vectorDimensions: await this.options.index.dimensions(),
            }
        };
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
}