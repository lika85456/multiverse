import type { StaticDatabaseSettings } from "../Database/StaticDatabaseStack";

export default interface DatabaseStorage {
    getDatabases(workspaceName: string): Promise<StaticDatabaseSettings[]>;
    addDatabase(workspaceName: string, databaseSettings: StaticDatabaseSettings): Promise<void>;
    removeDatabase(workspaceName: string, databaseName: string): Promise<void>;
}