import { Entity } from "electrodb";

import {
    DynamoDB, DynamoDBClient, waitUntilTableExists, waitUntilTableNotExists
} from "@aws-sdk/client-dynamodb";
import type { DatabaseConfiguration, Token } from "../DatabaseConfiguration";
import log from "@multiverse/log";

const logger = log.getSubLogger({ name: "DynamoChangesStorageDeployer" });

export type DatabaseInfrastructure = {
    configuration: DatabaseConfiguration;
    secretTokens: Token[];
    partitions: {
        lambda: {
            name: string;
            region: string;
            active: boolean;
            instances: {id: string, lastUpdated: number}[]
        }[]
        partition: number;
    }[];
};

const DatabaseInfrastructureEntity = (client: DynamoDBClient, table: string) => new Entity({
    model: {
        entity: "DatabaseInfrastructure",
        service: "multiverse",
        version: "1"
    },
    attributes: {
        name: {
            type: "string",
            required: true
        },
        region: {
            type: "string",
            required: true
        },
        dimensions: {
            type: "number",
            required: true
        },
        space: {
            type: ["ip", "cosine", "l2"] as const,
            required: true
        },
        secretTokens: {
            type: "list",
            items: {
                type: "map",
                properties: {
                    name: {
                        type: "string",
                        required: true
                    },
                    secret: {
                        type: "string",
                        required: true
                    },
                    validUntil: {
                        type: "number",
                        required: true
                    }
                }
            },
            required: true
        },
        partitions: {
            type: "list",
            items: {
                type: "map",
                properties: {
                    lambda: {
                        type: "list",
                        items: {
                            type: "map",
                            properties: {
                                name: {
                                    type: "string",
                                    required: true
                                },
                                region: {
                                    type: "string",
                                    required: true
                                },
                                active: {
                                    type: "boolean",
                                    required: true
                                },
                                instances: {
                                    type: "list",
                                    items: {
                                        type: "map",
                                        properties: {
                                            id: {
                                                type: "string",
                                                required: true
                                            },
                                            lastUpdated: {
                                                type: "number",
                                                required: true
                                            }
                                        }
                                    },
                                    required: true
                                }
                            }
                        },
                        required: true
                    },
                    partition: {
                        type: "number",
                        required: true
                    }
                }
            },
            required: true
        },
    },
    indexes: {
        primary: {
            pk: {
                field: "pk",
                composite: ["owner"]
            },
            sk: {
                field: "sk",
                composite: ["indexName"]
            }
        },
    }
}, {
    client,
    table
});

export class InfrastructureStorageDeployer {

    private dynamo: DynamoDB;

    constructor(private options: {
        region: string;
        tableName: string;
    }) {
        this.dynamo = new DynamoDB({ region: options.region });
    }

    public async deploy() {
        await this.createDatabaseTable();
        // await this.waitUntilActive(this.options.tableName);
        await waitUntilTableExists({
            client: this.dynamo,
            maxWaitTime: 60
        }, { TableName: this.options.tableName });
        await this.testTable(this.options.tableName);

        logger.info(`Dynamo ${this.options.tableName} deployed`);
    }

    public async exists() {
        try {
            await this.dynamo.describeTable({ TableName: this.options.tableName });

            return true;
        } catch (e) {
            return false;
        }
    }

    public async destroy() {
        await this.dynamo.deleteTable({ TableName: this.options.tableName });
        await waitUntilTableNotExists({
            client: this.dynamo,
            maxWaitTime: 60
        }, { TableName: this.options.tableName });

        logger.info(`Dynamo ${this.options.tableName} destroyed`);
    }

    private async createDatabaseTable() {
        logger.info(`Initializing dynamo ${this.options.tableName}`);

        await this.dynamo.createTable({
            TableName: this.options.tableName,
            KeySchema: [
                {
                    AttributeName: "pk",
                    KeyType: "HASH"
                },
                {
                    AttributeName: "sk",
                    KeyType: "RANGE"
                },
            ],
            AttributeDefinitions: [
                {
                    AttributeName: "pk",
                    AttributeType: "S"
                },
                {
                    AttributeName: "sk",
                    AttributeType: "S"
                },
            ],
            BillingMode: "PAY_PER_REQUEST",
        });

        logger.info(`Dynamo ${this.options.tableName} initialized`);
    }

    private async testTable(tableName: string) {
        // scan and read 0
        const scanResult = await this.dynamo.scan({
            TableName: tableName,
            Limit: 1
        });
        if (scanResult.Count !== 0) {
            throw new Error("Table is not empty");
        }
    }
}

/**
 * Each database has its own row in the table.
 */
export default class InfrastructureStorage {

    private databaseInfrastructureEntity;

    constructor(private options: {
        tableName: string;
        region: string
    }) {
        const client = new DynamoDBClient({ region: options.region });
        this.databaseInfrastructureEntity = DatabaseInfrastructureEntity(client, options.tableName);
    }

    public async getInfrastructure(indexConfiguration: IndexConfiguration): Promise<DatabaseInfrastructure | undefined> {
        const result = await this.databaseInfrastructureEntity.get({
            owner: indexConfiguration.owner,
            indexName: indexConfiguration.indexName
        }).go();

        return result.data ?? undefined;
    }

    public async setInfrastructure(infrastructure: DatabaseInfrastructure) {
        await this.databaseInfrastructureEntity.put({
            owner: infrastructure.configuration.owner,
            indexName: infrastructure.configuration.indexName,
            ...infrastructure
        }).go();
    }

    public async removeInfrastructure({ owner, indexName }: {
        owner: string;
        indexName: string;
    }) {
        await this.databaseInfrastructureEntity.delete({
            owner,
            indexName
        }).go();
    }

    public tableName(): string {
        return this.options.tableName;
    }
}