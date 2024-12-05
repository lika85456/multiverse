import {
    DynamoDB, DynamoDBClient, UpdateItemCommand, waitUntilTableExists, waitUntilTableNotExists
} from "@aws-sdk/client-dynamodb";
import {
    DeleteCommand,
    DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import log from "@multiverse/log";
import InfrastructureStorage from ".";
import type { Infrastructure } from ".";
import type { AwsToken } from "../core/AwsToken";

const logger = log.getSubLogger({ name: "DynamoChangesStorageDeployer" });

export class InfrastructureStorageDeployer {

    private dynamo: DynamoDB;

    constructor(private options: {
        region: string;
        tableName: string;
        awsToken: AwsToken
    }) {
        this.dynamo = new DynamoDB({
            region: options.region,
            credentials: options.awsToken
        });
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

type StoredInfrastructure = {
    pk: string;
} & Infrastructure;

/**
 * Each database has its own row in the table.
 */
export default class DynamoInfrastructureStorage extends InfrastructureStorage {

    private deployer: InfrastructureStorageDeployer;
    private dynamo: DynamoDBDocumentClient;

    constructor(private options: {
        tableName: string;
        region: string;
        awsToken: AwsToken
    }) {
        super();
        const db = new DynamoDBClient({
            region: options.region,
            credentials: options.awsToken
        });
        this.dynamo = DynamoDBDocumentClient.from(db);

        this.deployer = new InfrastructureStorageDeployer({
            region: options.region,
            tableName: options.tableName,
            awsToken: options.awsToken
        });
    }

    public getResourceName(): string {
        return this.options.tableName;
    }

    public async addStoredChanges(dbName: string, changesCount: number): Promise<number> {
        const result = await this.dynamo.send(new UpdateItemCommand({
            TableName: this.options.tableName,
            Key: { pk: { S: dbName } },
            UpdateExpression: "SET storedChanges = storedChanges + :changes",
            ExpressionAttributeValues: { ":changes": { N: changesCount.toString() } as any },
            ReturnValues: "UPDATED_NEW"
        })).catch(e => e);

        if (result instanceof Error) {
            if (result.name === "ConditionalCheckFailedException") {
                return 0;
            }

            throw result;
        }

        return parseInt(result.Attributes?.storedChanges?.N ?? "0");
    }

    public async setStoredChanges(dbName: string, changesCount: number): Promise<void> {
        await this.dynamo.send(new UpdateItemCommand({
            TableName: this.options.tableName,
            Key: { pk: { S: dbName } },
            UpdateExpression: "SET storedChanges = :changes",
            ExpressionAttributeValues: { ":changes": { N: changesCount.toString() } as any }
        }));
    }

    public async getStoredChanges(dbName: string): Promise<number> {
        const res = await this.dynamo.send(new GetCommand({
            TableName: this.options.tableName,
            Key: { pk: dbName },
            AttributesToGet: ["storedChanges"]
        }));

        if (res.Item) {
            return parseInt(res.Item?.storedChanges ?? "0");
        }

        return 0;
    }

    public async set(dbName: string, infrastructure: Infrastructure): Promise<void> {

        await this.dynamo.send(new PutCommand({
            TableName: this.options.tableName,
            Item: {
                pk: dbName,
                ...infrastructure
            }
        }));
    }

    public async setProperty<T extends keyof Infrastructure>(dbName: string, property: T, value: Infrastructure[T]): Promise<void> {
        // update only the property and keep the rest of the already existing object
        // the property can be number, string or an object
        await this.dynamo.send(new UpdateCommand({
            TableName: this.options.tableName,
            Key: { pk: dbName },
            UpdateExpression: `SET #${property} = :value`,
            ExpressionAttributeNames: { [`#${property}`]: property },
            ExpressionAttributeValues: { ":value": value }
        }));
    }

    public async get(dbName: string): Promise<Infrastructure | undefined> {
        return this.dynamo.send(new GetCommand({
            TableName: this.options.tableName,
            Key: { pk: dbName }
        }))
            .then(res => {
                if (res.Item) {
                    const item = res.Item as StoredInfrastructure;
                    const { pk: _pk, ...infrastructure } = item;

                    return infrastructure;
                }
            });
    }

    public async remove(dbName: string): Promise<void> {
        await this.dynamo.send(new DeleteCommand({
            TableName: this.options.tableName,
            Key: { pk: dbName }
        }));
    }

    public async list(): Promise<Infrastructure[]> {
        return this.dynamo.send(new ScanCommand({ TableName: this.options.tableName }))
            .then(res => {
                if (res.Items) {
                    return res.Items.map(item => {
                        const { pk: _pk, ...infrastructure } = item as StoredInfrastructure;

                        return infrastructure;
                    });
                }

                return [];
            });
    }

    public async deploy() {
        await this.deployer.deploy();
    }

    public async destroy() {
        await this.deployer.destroy();
    }

    public async exists() {
        return this.deployer.exists();
    }
}