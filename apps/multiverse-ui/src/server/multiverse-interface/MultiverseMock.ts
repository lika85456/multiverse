import type { IMultiverse, IMultiverseDatabase } from "@multiverse/multiverse/src";

import type { DatabaseConfiguration, Token } from "@multiverse/multiverse/src/DatabaseConfiguration";
import type {
    Query, QueryResult, SearchResultVector
} from "@multiverse/multiverse/src/core/Query";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import * as fs from "fs";

// example backup
//     [
//     {
//         "multiverseDatabase": {
//             "name": "database_1",
//             "secretTokens": [{
//                 "name": "token1",
//                 "secret": "secretsecret",
//                 "validUntil": 12345678
//             }],
//             "dimensions": 4,
//             "region": "eu-central-1",
//             "space": "l2"
//         },
//         "vectors": [
//             {
//                 "label": "label",
//                 "metadata": {},
//                 "vector": [0, 0, 0, 0],
//                 "distance": 1
//             }
//         ]
//     }
// ];

type DatabaseWrapper = {
    multiverseDatabase: IMultiverseDatabase;
    vectors: NewVector[];
};

const databases = new Map<string, DatabaseWrapper>();
const file = "./src/server/multiverse-interface/multiverseMock.json";

async function loadJsonFile() {
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
            databases.set(database.multiverseDatabase.name, {
                multiverseDatabase: new MultiverseDatabaseMock(database.multiverseDatabase),
                vectors: database.vectors
            });
        }
    } catch (error) {
        console.error("Error loading databases:", error);
    }
}

async function saveJsonFile() {
    const data = await Promise.all(Array.from(databases.values()).map(async(database) => {
        const databaseConfig = await database.multiverseDatabase.getConfiguration();

        return {
            multiverseDatabase: { ...databaseConfig },
            vectors: database.vectors
        };
    }));

    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error saving databases:", error);
    }
}

export function generateHex(length: number): string {
    let result = "";
    const hexCharacters = "0123456789abcdef";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * hexCharacters.length);
        result += hexCharacters.charAt(randomIndex);
    }

    return result;
}

async function refresh() {
    await saveJsonFile();
    await loadJsonFile();
}

class MultiverseDatabaseMock implements IMultiverseDatabase {
    private readonly databaseConfiguration: DatabaseConfiguration;

    constructor(config: DatabaseConfiguration) {
        this.databaseConfiguration = config;
    }

    async getConfiguration(): Promise<DatabaseConfiguration> {

        return Promise.resolve(this.databaseConfiguration);
    }

    async add(vector: NewVector[]): Promise<void> {
        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve();
        }
        const newValue: DatabaseWrapper = {
            multiverseDatabase: database.multiverseDatabase,
            vectors: [...database.vectors, ...vector]
        };
        databases.set(this.databaseConfiguration.name, newValue);
        await refresh();

        return Promise.resolve(undefined);
    }

    async remove(label: string[]): Promise<void> {
        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve();
        }
        const vectors = database.vectors;

        databases.set(this.databaseConfiguration.name, {
            multiverseDatabase: database.multiverseDatabase,
            vectors: vectors.filter((vector) => !label.includes(vector.label))
        });
        await refresh();

        return Promise.resolve();
    }

    async query(query: Query): Promise<QueryResult> {
        const queryMetrics = query.vector.reduce((acc, value) => acc + value, 0);
        const vectors = databases.get(this.databaseConfiguration.name)?.vectors;
        if (!vectors) {
            return Promise.resolve({ result: [] });
        }
        const results = vectors.map((vector): SearchResultVector => {
            return {
                label: vector.label,
                metadata: vector.metadata || {},
                vector: vector.vector,
                distance: Math.abs(queryMetrics - vector.vector.reduce((acc, value) => acc + value, 0))
            };
        }).sort((a, b) => a.distance - b.distance).slice(0, query.k);

        return Promise.resolve({ result: results });
    }

    async addToken(token: Token): Promise<void> {

        this.databaseConfiguration.secretTokens.push({
            name: token.name,
            secret: generateHex(16),
            validUntil: token.validUntil
        });
        await refresh();

        return Promise.resolve(undefined);
    }

    async removeToken(tokenName: string): Promise<void> {
        await loadJsonFile();
        const index = this.databaseConfiguration.secretTokens.findIndex((token) => token.name === tokenName);
        if (index !== -1) {
            this.databaseConfiguration.secretTokens.splice(index, 1);
        }
        databases.set(this.databaseConfiguration.name, {
            multiverseDatabase: this,
            vectors: databases.get(this.databaseConfiguration.name)?.vectors || []
        });

        await refresh();

        return Promise.resolve();
    }
}

export class MultiverseMock implements IMultiverse {
    private readonly region: string;
    constructor() {
        this.region = "eu-central-1";
        loadJsonFile();
    }

    async createDatabase(options: Omit<DatabaseConfiguration, "region">): Promise<void> {
        await loadJsonFile();
        databases.set(options.name, {
            multiverseDatabase: new MultiverseDatabaseMock({
                ...options,
                region: this.region as "eu-central-1"
            }),
            vectors: []
        });
        await refresh();

        return Promise.resolve();
    }

    async getDatabase(name: string): Promise<IMultiverseDatabase | undefined> {
        await loadJsonFile();
        const database = databases.get(name);
        if (!database) {
            return Promise.resolve(undefined);
        }

        return Promise.resolve(database.multiverseDatabase);
    }

    async listDatabases(): Promise<IMultiverseDatabase[]> {
        await loadJsonFile();

        return Promise.resolve(Array.from(databases.values()).map((database) => database.multiverseDatabase));
    }

    async removeDatabase(name: string): Promise<void> {
        await loadJsonFile();
        databases.delete(name);
        await refresh();

        return Promise.resolve();
    }

}