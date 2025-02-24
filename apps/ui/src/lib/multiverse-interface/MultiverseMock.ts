import type {
    IMultiverse, IMultiverseDatabase, MultiverseDatabaseConfiguration
} from "@multiverse/multiverse";

import type { Token } from "../../../../../packages/multiverse/src/core/DatabaseConfiguration";
import type {
    Query, QueryResult, SearchResultVector
} from "../../../../../packages/multiverse/src/core/Query";
import type { NewVector } from "../../../../../packages/multiverse/src/core/Vector";
import fs from "fs";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";
import { performance } from "node:perf_hooks";
import { decryptSecretAccessKey, encryptSecretAccessKey } from "@/lib/encryption/aws-token";
import type {
    AddEvent, QueryEvent, RemoveEvent
} from "@multiverse/multiverse/src/core/Events";
import SQSSStatisticsQueue from "@multiverse/multiverse/src/StatisticsQueue/SQSStatisticsQueue";

type DatabaseWrapper = {
    multiverseDatabase: MultiverseDatabaseMock;
    vectors: NewVector[];
};

const databases = new Map<string, DatabaseWrapper>();
const file = "./src/lib/multiverse-interface/multiverseMock.json";

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

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

        const parsedData = JSON.parse(jsonData);
        for (const database of parsedData) {
            const secretAccessKet = decryptSecretAccessKey(database.awsToken.accessKeyId, database.awsToken.secretAccessKey);
            databases.set(database.multiverseDatabase.name, {
                multiverseDatabase: new MultiverseDatabaseMock({
                    config: database.multiverseDatabase,
                    awsToken: {
                        accessKeyId: database.awsToken.accessKeyId,
                        secretAccessKey: secretAccessKet,
                    }
                }),
                vectors: database.vectors,
            });
        }
    } catch (error) {
        log.error("Error loading databases:", error);
    }
}

async function saveJsonFile() {
    const data = await Promise.all(Array.from(databases.values()).map(async(database) => {
        const databaseConfig = await database.multiverseDatabase.getConfiguration();
        const awsToken = database.multiverseDatabase.getAwsToken();

        const encryptedSecretAccessKey = encryptSecretAccessKey(awsToken.awsToken.accessKeyId, awsToken.awsToken.secretAccessKey,);

        return {
            multiverseDatabase: { ...databaseConfig },
            vectors: database.vectors,
            awsToken: {
                accessKeyId: awsToken.awsToken.accessKeyId,
                secretAccessKey: encryptedSecretAccessKey,
            },
        };
    }));

    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        log.error("Error saving databases:", error);
    }
}

async function refresh() {
    await saveJsonFile();
    await loadJsonFile();
}

class MultiverseDatabaseMock implements IMultiverseDatabase {
    private databaseConfiguration: MultiverseDatabaseConfiguration;
    private readonly awsToken: {
        accessKeyId: string;
        secretAccessKey: string;
    };

    constructor(options: {
        config: MultiverseDatabaseConfiguration,
        awsToken: {
            accessKeyId: string;
            secretAccessKey: string;
        }
    }) {
        this.databaseConfiguration = options.config;
        this.awsToken = options.awsToken;
    }

    ping(wait?: number): Promise<string> {
        if (wait) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve("pong");
                }, wait);
            });
        }

        return Promise.resolve("pong");
    }

    getAwsToken(): {awsToken: { accessKeyId: string; secretAccessKey: string; }} {
        return {
            awsToken: {
                accessKeyId: this.awsToken.accessKeyId,
                secretAccessKey: this.awsToken.secretAccessKey,
            }
        };
    }

    async getConfiguration(): Promise<MultiverseDatabaseConfiguration> {

        return Promise.resolve(this.databaseConfiguration);
    }

    async updateConfiguration(configuration: MultiverseDatabaseConfiguration): Promise<void> {
        this.databaseConfiguration = configuration;
        await refresh();

        return Promise.resolve();
    }

    getTotalMetadataSize(vectors: NewVector[]): number {
        return vectors.reduce((acc, vector) => {
            return acc + (JSON.stringify(vector.metadata)?.length || 0);
        }, 0);
    }

    async add(vector: NewVector[]): Promise<{unprocessedItems: string[]}> {
        await loadJsonFile();

        await sleep(200);

        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve({ unprocessedItems: [] });
        }

        // remove old vectors with the same label to simulate replacement
        const oldVectors = database.vectors.filter((oldVector) => {
            return !vector.find((newVector) => newVector.label === oldVector.label);
        });
        const newValue: DatabaseWrapper = {
            multiverseDatabase: database.multiverseDatabase,
            vectors: [...oldVectors, ...vector],
        };
        databases.set(this.databaseConfiguration.name, newValue);
        await refresh();

        const event: AddEvent = {
            timestamp: UTCDate.now(),
            dbName: this.databaseConfiguration.name,
            type: "add",
            vectorsAfter: newValue.vectors.length,
            count: 1,
            dataSize: newValue.vectors.length * this.databaseConfiguration.dimensions * 4 + this.getTotalMetadataSize(newValue.vectors),
        };

        log.debug("Add event:", event);

        const sqs = new SQSSStatisticsQueue({
            awsToken: this.awsToken,
            region: "eu-central-1",
            queueName: this.databaseConfiguration.statisticsQueueName
        });
        await sqs.push(event);

        return Promise.resolve({ unprocessedItems: [] });
    }

    async remove(label: string[]): Promise<{unprocessedItems: string[]}> {
        await sleep(200);

        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            throw new Error(`Database ${this.databaseConfiguration.name} not found`);
        }
        const vectors = database.vectors;
        const newValue: DatabaseWrapper = {
            multiverseDatabase: database.multiverseDatabase,
            vectors: vectors.filter((vector) => !label.includes(vector.label)),
        };
        databases.set(this.databaseConfiguration.name, newValue);
        await refresh();

        const event: RemoveEvent = {
            timestamp: UTCDate.now(),
            dbName: this.databaseConfiguration.name,
            type: "remove",
            vectorsAfter: newValue.vectors.length,
            count: label.length,
            dataSize: newValue.vectors.length * this.databaseConfiguration.dimensions * 4 + this.getTotalMetadataSize(newValue.vectors)
        };
        log.debug("Remove event:", event);

        const sqs = new SQSSStatisticsQueue({
            awsToken: this.awsToken,
            region: "eu-central-1",
            queueName: this.databaseConfiguration.statisticsQueueName
        });
        await sqs.push(event);

        return Promise.resolve({ unprocessedItems: [] });
    }

    async query(query: Query): Promise<QueryResult> {
        const startTime = performance.now();

        await sleep(200);

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

        const endTime = performance.now();
        const duration = endTime - startTime;

        const event: QueryEvent = {
            timestamp: UTCDate.now(),
            dbName: this.databaseConfiguration.name,
            type: "query",
            duration: duration,
        };

        const sqs = new SQSSStatisticsQueue({
            awsToken: this.awsToken,
            region: "eu-central-1",
            queueName: this.databaseConfiguration.statisticsQueueName
        });
        await sqs.push(event);

        return Promise.resolve({ result: results });
    }

    async addToken(token: Token): Promise<void> {
        await sleep(200);

        if (this.databaseConfiguration.secretTokens.find((t) => t.name === token.name)) {
            log.error("Token with this name already exists");
            throw new Error("Token with this name already exists");
        }

        this.databaseConfiguration.secretTokens.push({
            name: token.name,
            secret: token.secret,
            validUntil: token.validUntil
        });
        await refresh();
    }

    async removeToken(tokenName: string): Promise<void> {
        await sleep(200);

        await loadJsonFile();
        const index = this.databaseConfiguration.secretTokens.findIndex((token) => token.name === tokenName);
        if (index !== -1) {
            this.databaseConfiguration.secretTokens.splice(index, 1);
        } else {
            throw new Error(`Token ${tokenName} not found`);
        }
        databases.set(this.databaseConfiguration.name, {
            multiverseDatabase: this,
            vectors: databases.get(this.databaseConfiguration.name)?.vectors || [],
        });

        await refresh();
    }
}

export class MultiverseMock implements IMultiverse {
    private readonly region: string;
    private readonly awsToken: {
        accessKeyId: string;
        secretAccessKey: string;
    };

    constructor(options: {awsToken: {
            accessKeyId: string;
            secretAccessKey: string;
        },
        region: string
    }) {
        this.awsToken = options.awsToken;
        this.region = options.region;
        loadJsonFile().then();
    }

    async createDatabase(options: MultiverseDatabaseConfiguration,): Promise<void> {
        await loadJsonFile();

        await sleep(1000 * 5); // 5 seconds, to simulate fast creation speed

        databases.set(options.name, {
            multiverseDatabase: new MultiverseDatabaseMock({
                config: {
                    ...options,
                    region: this.region as "eu-central-1"
                },
                awsToken: this.awsToken,
            }),
            vectors: []
        });
        await refresh();
    }

    async getDatabase(name: string): Promise<IMultiverseDatabase | undefined> {
        await loadJsonFile();

        await sleep(500);

        const database = databases.get(name);
        if (!database) {
            return;
        }

        // Check if the database belongs to the authenticated user
        if (database.multiverseDatabase.getAwsToken().awsToken.accessKeyId !== this.awsToken.accessKeyId) {
            return;
        }

        return Promise.resolve(database.multiverseDatabase);
    }

    async listDatabases(): Promise<IMultiverseDatabase[]> {
        await loadJsonFile();

        await sleep(500);

        return (Array.from(databases.values())
            .map((database) => database.multiverseDatabase))
            .filter((database) => {
                // Filter databases that belong to the authenticated user
                return database.getAwsToken().awsToken.accessKeyId === this.awsToken.accessKeyId;
            });
    }

    async removeDatabase(name: string): Promise<void> {
        await loadJsonFile();

        const database = databases.get(name);
        if (!database) {
            return Promise.resolve();
        }
        const vectorsLength = database.vectors.length;
        await sleep(100 * vectorsLength + 1000 * 5); // 5 seconds + 100ms per vector to simulate fast deletion speed

        if (database.multiverseDatabase.getAwsToken().awsToken.accessKeyId !== this.awsToken.accessKeyId) {
            return Promise.resolve();
        }

        databases.delete(name);
        await refresh();

        return Promise.resolve();
    }

    async destroySharedInfrastructure(): Promise<void> {
        const databases = await this.listDatabases();
        await Promise.all(databases.map(async(database) => {
            await this.removeDatabase((await database.getConfiguration()).name);
        }));
    }
}