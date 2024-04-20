import type {
    IMultiverse, IMultiverseDatabase, MultiverseDatabaseConfiguration
} from "@multiverse/multiverse";

import type { Token } from "../../../../../packages/multiverse/src/core/DatabaseConfiguration";
import type {
    Query, QueryResult, SearchResultVector
} from "../../../../../packages/multiverse/src/core/Query";
import type { NewVector } from "../../../../../packages/multiverse/src/core/Vector";
import type {
    AddEvent, Event, QueryEvent, RemoveEvent
} from "@/lib/statistics-processor/event";
import {
    GetQueueUrlCommand, SendMessageCommand, SQSClient
} from "@aws-sdk/client-sqs";
import fs from "fs";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";
import { performance } from "node:perf_hooks";

type DatabaseWrapper = {
    multiverseDatabase: MultiverseDatabaseMock;
    vectors: NewVector[];
};

const databases = new Map<string, DatabaseWrapper>();
const file = "./src/server/multiverse-interface/multiverseMock.json";

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
            databases.set(database.multiverseDatabase.name, {
                multiverseDatabase: new MultiverseDatabaseMock({
                    config: database.multiverseDatabase,
                    awsToken: database.awsToken,
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

        return {
            multiverseDatabase: { ...databaseConfig },
            vectors: database.vectors,
            awsToken: awsToken.awsToken,
        };
    }));

    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        log.error("Error saving databases:", error);
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

    getAwsToken(): {awsToken: { accessKeyId: string; secretAccessKey: string; }} {
        return {
            awsToken: {
                accessKeyId: this.awsToken.accessKeyId,
                secretAccessKey: this.awsToken.secretAccessKey,
            }
        };
    }

    private async sendStatistics(event: Event): Promise<void> {
        if (!this.databaseConfiguration.statisticsQueueName) {
            return;
        }
        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: this.awsToken.accessKeyId,
                secretAccessKey: this.awsToken.secretAccessKey
            }
        });
        try {
            const inputGetQueueUrl = { // GetQueueUrlRequest
                QueueName: this.databaseConfiguration.statisticsQueueName, // required
            };
            const getQueueUrlCommand = new GetQueueUrlCommand(inputGetQueueUrl);
            const getQueueUrlCommandOutput = await sqsClient.send(getQueueUrlCommand);
            const queueUrl = getQueueUrlCommandOutput.QueueUrl;
            if (!queueUrl) {
                throw new Error("Queue not found");
            }

            const sendMessageCommand = new SendMessageCommand({
                MessageBody: JSON.stringify([event]),
                QueueUrl: queueUrl
            });
            await sqsClient.send(sendMessageCommand);
        } catch (error) {
            log.error("Error sending statistics: ", error);
        }
    };

    async getConfiguration(): Promise<MultiverseDatabaseConfiguration> {

        return Promise.resolve(this.databaseConfiguration);
    }

    async updateConfiguration(configuration: MultiverseDatabaseConfiguration): Promise<void> {
        this.databaseConfiguration = configuration;
        await refresh();

        return Promise.resolve();
    }

    async add(vector: NewVector[]): Promise<void> {
        await loadJsonFile();

        await sleep(200);

        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve();
        }

        const oldVectors = database.vectors;
        if (vector.some((newVector) => oldVectors.some((oldVector) => oldVector.label === newVector.label))) {
            log.error("Vector with the same label already exists");
            throw new Error("Vector with the same label already exists");
        }

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
            totalVectors: newValue.vectors.length,
        };

        await this.sendStatistics(event);;
    }

    async remove(label: string[]): Promise<void> {
        await sleep(200);

        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            throw new Error(`Database ${this.databaseConfiguration.name} not found`);
        }
        const vectors = database.vectors;
        if (label.some((l) => !vectors.some((vector) => vector.label === l))) {
            throw new Error("Vector not found");
        }

        databases.set(this.databaseConfiguration.name, {
            multiverseDatabase: database.multiverseDatabase,
            vectors: vectors.filter((vector) => !label.includes(vector.label)),
        });
        await refresh();

        const event: RemoveEvent = {
            timestamp: UTCDate.now(),
            dbName: this.databaseConfiguration.name,
            type: "remove",
            totalVectors: databases.get(this.databaseConfiguration.name)?.vectors.length || 0,
        };

        await this.sendStatistics(event);

        return Promise.resolve();
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
            query: JSON.stringify(query),
            duration: duration,
        };

        await this.sendStatistics(event);

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
        loadJsonFile();
    }

    async createDatabase(options: MultiverseDatabaseConfiguration,): Promise<void> {
        await loadJsonFile();

        await sleep(1000 * 20); // 20 seconds, really fast
        // await sleep(1000 * 30); // 30 seconds, realistic scenario, fast case
        // await sleep(1000 * 60); // 1 minute, realistic scenario, awaited case

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

        await sleep(1000);

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

        await sleep(1000);

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
        await sleep(100 * vectorsLength + 1000 * 20); // 5 seconds + 100ms per vector to simulate deletion speed
        // await sleep(1000 * 30); // 30 seconds, realistic scenario, fast case
        // await sleep(1000 * 60); // 1 minute, realistic scenario, awaited case

        if (database.multiverseDatabase.getAwsToken().awsToken.accessKeyId !== this.awsToken.accessKeyId) {
            return Promise.resolve();
        }

        databases.delete(name);
        await refresh();

        return Promise.resolve();
    }

    async removeSharedInfrastructure(): Promise<void> {
        const databases = await this.listDatabases();
        await Promise.all(databases.map(async(database) => {
            await this.removeDatabase((await database.getConfiguration()).name);
        }));
    }
}