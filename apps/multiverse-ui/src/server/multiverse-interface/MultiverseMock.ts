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
            databases.set(database.multiverseDatabase.name, {
                multiverseDatabase: new MultiverseDatabaseMock(database.multiverseDatabase),
                vectors: database.vectors
            });
        }
    } catch (error) {
        console.error("Error loading databases:", error);
    }
}

function saveJsonFile() {
    Promise.all(Array.from(databases.values()).map(async(database) => {
        const databaseConfig = await database.multiverseDatabase.getConfiguration();

        return {
            multiverseDatabase: { ...databaseConfig },
            vectors: database.vectors
        };
    })).then((data) => {
        try {
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error("Error saving databases:", error);
        }
    });
}

function refresh() {
    saveJsonFile();
    loadJsonFile();
}

class MultiverseDatabaseMock implements IMultiverseDatabase {
    private readonly databaseConfiguration: DatabaseConfiguration;

    constructor(config: DatabaseConfiguration) {
        this.databaseConfiguration = config;
    }

    getConfiguration(): Promise<DatabaseConfiguration> {

        return Promise.resolve(this.databaseConfiguration);
    }

    add(vector: NewVector[]): Promise<void> {
        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve();
        }
        const newValue: DatabaseWrapper = {
            multiverseDatabase: database.multiverseDatabase,
            vectors: [...database.vectors, ...vector]
        };
        databases.set(this.databaseConfiguration.name, newValue);
        refresh();

        return Promise.resolve(undefined);
    }

    remove(label: string[]): Promise<void> {
        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve();
        }
        const vectors = database.vectors;

        databases.set(this.databaseConfiguration.name, {
            multiverseDatabase: database.multiverseDatabase,
            vectors: vectors.filter((vector) => !label.includes(vector.label))
        });
        refresh();

        return Promise.resolve();
    }

    query(query: Query): Promise<QueryResult> {
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

    addToken(token: Token): Promise<void> {
        this.databaseConfiguration.secretTokens.push(token);
        refresh();

        return Promise.resolve(undefined);
    }

    removeToken(tokenName: string): Promise<void> {
        loadJsonFile();
        const index = this.databaseConfiguration.secretTokens.findIndex((token) => token.name === tokenName);
        if (index !== -1) {
            this.databaseConfiguration.secretTokens.splice(index, 1);
        }
        refresh();

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
        databases.set(options.name, {
            multiverseDatabase: new MultiverseDatabaseMock({
                ...options,
                region: this.region as "eu-central-1"
            }),
            vectors: []
        });
        refresh();

        return Promise.resolve();
    }

    getDatabase(name: string): Promise<IMultiverseDatabase | undefined> {
        loadJsonFile();

        return Promise.resolve(databases.get(name)?.multiverseDatabase);
    }

    listDatabases(): Promise<IMultiverseDatabase[]> {
        loadJsonFile();

        return Promise.resolve(Array.from(databases.values()).map((database) => database.multiverseDatabase));
    }

    removeDatabase(name: string): Promise<void> {
        loadJsonFile();
        databases.delete(name);
        refresh();

        return Promise.resolve();
    }

}