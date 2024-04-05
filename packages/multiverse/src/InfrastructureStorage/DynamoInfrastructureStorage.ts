import {
    DynamoDB, DynamoDBClient, waitUntilTableExists, waitUntilTableNotExists
} from "@aws-sdk/client-dynamodb";
import {
    DeleteCommand,
    DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand
} from "@aws-sdk/lib-dynamodb";
import log from "@multiverse/log";
import type InfrastructureStorage from ".";
import type { Infrastructure } from ".";

const logger = log.getSubLogger({ name: "DynamoChangesStorageDeployer" });

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
            ],
            AttributeDefinitions: [
                {
                    AttributeName: "pk",
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
export default class DynamoInfrastructureStorage implements InfrastructureStorage {

    private deployer: InfrastructureStorageDeployer;
    private dynamo: DynamoDBDocumentClient;

    constructor(private options: {
        tableName: string;
        region: string
    }) {
        const db = new DynamoDBClient({ region: options.region });
        this.dynamo = DynamoDBDocumentClient.from(db);

        this.deployer = new InfrastructureStorageDeployer({
            region: options.region,
            tableName: options.tableName
        });
    }

    public async set(dbName: string, infrastructure: Infrastructure): Promise<void> {
        await this.dynamo.send(new PutCommand({
            TableName: this.options.tableName,
            Item: {
                pk: dbName,
                infrastructure
            }
        }));
    }

    public async get(dbName: string): Promise<Infrastructure | undefined> {
        return this.dynamo.send(new GetCommand({
            TableName: this.options.tableName,
            Key: { pk: dbName }
        })).then(res => res.Item?.infrastructure);
    }

    public async remove(dbName: string): Promise<void> {
        await this.dynamo.send(new DeleteCommand({
            TableName: this.options.tableName,
            Key: { pk: dbName }
        }));
    }

    public async list(): Promise<Infrastructure[]> {
        return this.dynamo.send(new ScanCommand({ TableName: this.options.tableName }))
            .then(res => res.Items?.map(i => i.infrastructure) as Infrastructure[]);
    }

    public async deploy() {
        await this.deployer.deploy();
    }

    public async destroy() {
        await this.deployer.destroy();
    }
}