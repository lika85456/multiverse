import type { StaticDatabaseSettings } from "../Database/StaticDatabaseStack";
import type DatabaseStorage from "./DatabaseStorage";

export default class MemoryDatabaseStorage implements DatabaseStorage {

    private databases: Record<string, StaticDatabaseSettings[]> = {};

    getDatabases(workspaceName: string): Promise<StaticDatabaseSettings[]> {
        return Promise.resolve(this.databases[workspaceName] || []);
    }

    addDatabase(workspaceName: string, databaseSettings: Omit<StaticDatabaseSettings, "collectionsBucket">): Promise<void> {
        if (!this.databases[workspaceName]) {
            this.databases[workspaceName] = [];
        }
        this.databases[workspaceName].push(databaseSettings as any);
        return Promise.resolve();
    }

    removeDatabase(workspaceName: string, databaseName: string): Promise<void> {
        if (!this.databases[workspaceName]) {
            return Promise.resolve();
        }
        this.databases[workspaceName] = this.databases[workspaceName].filter(database => database.name !== databaseName);
        return Promise.resolve();
    }
}