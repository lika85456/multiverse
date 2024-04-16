import type { IMultiverse, IMultiverseDatabase } from "@multiverse/multiverse/src";

import type { StoredDatabaseConfiguration, Token } from "@multiverse/multiverse/src/core/DatabaseConfiguration";
import type {
    Query, QueryResult, SearchResultVector
} from "@multiverse/multiverse/src/core/Query";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import type {
    AddEvent, Event, QueryEvent, RemoveEvent
} from "@/features/statistics/statistics-processor/event";
import {
    GetQueueUrlCommand, SendMessageCommand, SQSClient
} from "@aws-sdk/client-sqs";
import fs from "fs";
import { UTCDate } from "@date-fns/utc";

type DatabaseWrapper = {
    multiverseDatabase: MultiverseDatabaseMock;
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
                multiverseDatabase: new MultiverseDatabaseMock({
                    config: database.multiverseDatabase,
                    awsToken: database.awsToken,
                }),
                vectors: database.vectors,
            });
        }
    } catch (error) {
        console.error("Error loading databases:", error);
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
    private readonly databaseConfiguration: StoredDatabaseConfiguration;
    private readonly awsToken: {
        accessKeyId: string;
        secretAccessKey: string;
    };

    constructor(options: {
        config: StoredDatabaseConfiguration,
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
            return Promise.resolve(undefined);
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
            console.log("Error sending statistics: ", error);
        }

        return Promise.resolve(undefined);
    };

    async getConfiguration(): Promise<StoredDatabaseConfiguration> {

        return Promise.resolve(this.databaseConfiguration);
    }

    async add(vector: NewVector[]): Promise<void> {
        const database = databases.get(this.databaseConfiguration.name);
        if (!database) {
            return Promise.resolve();
        }
        const newValue: DatabaseWrapper = {
            multiverseDatabase: database.multiverseDatabase,
            vectors: [...database.vectors, ...vector],
        };
        databases.set(this.databaseConfiguration.name, newValue);
        await refresh();

        const event: AddEvent = {
            timestamp: UTCDate.now(),
            dbName: this.databaseConfiguration.name,
            type: "add",
            totalVectors: newValue.vectors.length,
        };

        await this.sendStatistics(event);

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
            vectors: databases.get(this.databaseConfiguration.name)?.vectors || [],
        });

        await refresh();

        return Promise.resolve();
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

    async createDatabase(options: Omit<StoredDatabaseConfiguration, "region">,): Promise<void> {
        await loadJsonFile();
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

        return Promise.resolve();
    }

    async getDatabase(name: string): Promise<IMultiverseDatabase | undefined> {
        await loadJsonFile();
        const database = databases.get(name);
        if (!database) {
            return Promise.resolve(undefined);
        }

        // Check if the database belongs to the authenticated user
        if (database.multiverseDatabase.getAwsToken().awsToken.accessKeyId !== this.awsToken.accessKeyId) {
            return Promise.resolve(undefined);
        }

        return Promise.resolve(database.multiverseDatabase);
    }

    async listDatabases(): Promise<IMultiverseDatabase[]> {
        await loadJsonFile();

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
        if (database.multiverseDatabase.getAwsToken().awsToken.accessKeyId !== this.awsToken.accessKeyId) {
            return Promise.resolve();
        }

        databases.delete(name);
        await refresh();

        return Promise.resolve();
    }

}