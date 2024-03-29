import type { IMultiverse, IMultiverseDatabase } from "@multiverse/multiverse/src";

import type { DatabaseConfiguration, Token } from "@multiverse/multiverse/src/DatabaseConfiguration";
import type { Query, QueryResult } from "@multiverse/multiverse/src/core/Query";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import * as fs from "fs";

// example backup
// [
//   {
//     "name": "database_1",
//     "secretTokens": [{
//       "name": "token1",
//       "secret": "secretsecret",
//       "validUntil": 12345678
//     }],
//     "dimensions": 1536,
//     "region": "eu-central-1",
//     "space": "l2"
//   }
// ]

const databases = new Map<string, IMultiverseDatabase>();
const file = "./src/server/multiverse-interface/multiverseMock.json";

function loadJsonFile() {
    try {
        if (!fs.existsSync(file)) {
            // If file doesn't exist, create it and write []
            fs.writeFileSync(file, "[]", "utf-8");
        }

        const jsonData = fs.readFileSync(file, "utf-8");
        if (!jsonData) {
            return;
        }
        // console.log("jsonData", jsonData);

        const parsedData = JSON.parse(jsonData);
        for (const database of parsedData) {
            databases.set(database.name, new MultiverseDatabaseMock(database));
        }
    } catch (error) {
        console.error("Error loading databases:", error);
    }
}

async function saveJsonFile() {
    const data = await Promise.all(Array.from(databases.values()).map(async(database) => {
        const databaseConfig = await database.getConfiguration();

        return { ...databaseConfig };
    }));

    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error saving databases:", error);
    }
}

class MultiverseDatabaseMock implements IMultiverseDatabase {
    private readonly databaseConfiguration: DatabaseConfiguration;

    constructor(config: DatabaseConfiguration) {
        this.databaseConfiguration = config;
    }

    add(vector: NewVector[]): Promise<void> {
        console.log(vector);

        saveJsonFile().then();

        return Promise.resolve(undefined);
    }

    addToken(token: Token): Promise<void> {
        console.log(token);

        saveJsonFile().then();

        return Promise.resolve(undefined);
    }

    getConfiguration(): Promise<DatabaseConfiguration> {

        return Promise.resolve(this.databaseConfiguration);
    }

    query(query: Query): Promise<QueryResult> {
        console.log(query);
        const result: QueryResult = {
            result: [{
                label: "label",
                metadata: {},
                vector: [0, 0, 0, 0],
                distance: 1
            }]
        };

        return Promise.resolve(result);
    }

    remove(label: string[]): Promise<void> {
        console.log(label);

        saveJsonFile().then();

        return Promise.resolve();
    }

    removeToken(tokenName: string): Promise<void> {
        console.log(tokenName);

        saveJsonFile().then();

        return Promise.resolve();
    }
}

export class MultiverseMock implements IMultiverse {
    private readonly region: string;
    constructor() {
        this.region = "eu-central-1";
        loadJsonFile();
    }

    createDatabase(options: Omit<DatabaseConfiguration, "region">): Promise<void> {
        loadJsonFile();
        databases.set(options.name, new MultiverseDatabaseMock({
            ...options,
            region: this.region as "eu-central-1"
        }));
        saveJsonFile().then();

        return Promise.resolve();
    }

    getDatabase(name: string): Promise<IMultiverseDatabase | undefined> {
        loadJsonFile();

        return Promise.resolve(databases.get(name));
    }

    listDatabases(): Promise<IMultiverseDatabase[]> {
        loadJsonFile();

        return Promise.resolve(Array.from(databases.values()));
    }

    removeDatabase(name: string): Promise<void> {
        databases.delete(name);

        saveJsonFile().then();

        return Promise.resolve();
    }

}