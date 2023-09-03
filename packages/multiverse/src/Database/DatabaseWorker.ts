import type ChangesStorage from "../ChangesStorage";
import type Index from "../Index";
import type { IndexConfiguration } from "../IndexConfiguration";
import type SnapshotStorage from "../SnapshotStorage";
import type { DatabaseQuery, DatabaseQueryResult } from "./DatabaseClient";
import type DatabaseClient from "./DatabaseClient";

export default class DatabaseWorker implements DatabaseClient {

    private lastUpdate = 0;

    constructor(private options: {
        config: IndexConfiguration,
        snapshotStorage: SnapshotStorage,
        changesStorage: ChangesStorage,
        index: Index,
    }) {
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
    }

    public async wake(wait: number): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async saveSnapshot(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async loadLatestSnapshot(): Promise<void> {
        throw new Error("Method not implemented.");
    }

}