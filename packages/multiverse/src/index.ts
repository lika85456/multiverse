/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
    DatabaseConfiguration,
    DatabaseID, Region, StoredDatabaseConfiguration, Token
} from "./core/DatabaseConfiguration";
import type { Query, QueryResult } from "./core/Query";
import type { NewVector } from "./core/Vector";
import { ENV } from "./env";
import type InfrastructureStorage from "./InfrastructureStorage";
import DynamoInfrastructureStorage from "./InfrastructureStorage/DynamoInfrastructureStorage";
import type Orchestrator from "./Orchestrator/Orchestrator";
import LambdaOrchestrator from "./Orchestrator/LambdaOrchestrator";
import logger from "@multiverse/log";
import DynamoChangesStorage from "./ChangesStorage/DynamoChangesStorage";
import S3SnapshotStorage from "./SnapshotStorage/S3SnapshotStorage";

const log = logger.getSubLogger({ name: "Multiverse" });

export type AwsToken = {
    accessKeyId: string;
    secretAccessKey: string;
};

export interface IMultiverseDatabase {
    query(query: Query): Promise<QueryResult>;

    add(vector: NewVector[]): Promise<void>;

    remove(label: string[]): Promise<void>;

    getConfiguration(): Promise<DatabaseConfiguration>;

    addToken(token: Token): Promise<void>;

    removeToken(tokenName: string): Promise<void>;
}

export interface IMultiverse {
    createDatabase(options: DatabaseConfiguration): Promise<void>;

    removeDatabase(name: string): Promise<void>;

    getDatabase(name: string): Promise<IMultiverseDatabase | undefined>

    listDatabases(): Promise<IMultiverseDatabase[]>;
}

export class MultiverseDatabase implements IMultiverseDatabase {

    private orchestrator: Orchestrator;

    constructor(private options: {
        name: string,
        region: Region,
        secretToken: string,
    }) {
        this.orchestrator = new LambdaOrchestrator({
            databaseId: {
                name: options.name,
                region: options.region
            },
            secretToken: options.secretToken
        });
    }

    public async query(query: Query): Promise<QueryResult> {
        return this.orchestrator.query(query);
    }

    public async add(vector: NewVector[]) {
        await this.orchestrator.addVectors(vector);
    }

    public async remove(label: string[]) {
        await this.orchestrator.removeVectors(label);
    }

    public async getConfiguration() {
        return this.orchestrator.getConfiguration();
    }

    public async addToken(token: Token) {
        await this.orchestrator.addToken(token);
    }

    public async removeToken(tokenName: string) {
        await this.orchestrator.removeToken(tokenName);
    }
}

// TODO!: library /src imports!

/**
 * This is the entry for the whole Multiverse library.
 * From here you can manipulate databases. It needs to be initialized with the region and secret token.
 */
export default class Multiverse implements IMultiverse {

    private INFRASTRUCTURE_TABLE_NAME = "multiverse-infrastructure-storage";

    private awsToken: AwsToken;

    private infrastructureStorage: InfrastructureStorage;

    /**
     * Either set the AWS credentials in the environment or provide them here.
     * @param options
     */
    constructor(private options: {
        region: Region,
        awsToken?: AwsToken,
    }) {

        if (!options.awsToken && (!ENV.AWS_ACCESS_KEY_ID || !ENV.AWS_SECRET_ACCESS_KEY)) {
            throw new Error("AWS credentials are required");
        }

        this.awsToken = options.awsToken ?? {
            accessKeyId: ENV.AWS_ACCESS_KEY_ID!,
            secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY!
        };

        this.infrastructureStorage = new DynamoInfrastructureStorage({
            region: options.region,
            tableName: this.INFRASTRUCTURE_TABLE_NAME
        });
    }

    private async deploySharedInfrastructure() {
        if (await this.infrastructureStorage.exists()) {
            return;
        }

        log.info("Deploying shared infrastructure");

        await this.infrastructureStorage.deploy();
    }

    public async removeSharedInfrastructure() {
        if (!(await this.infrastructureStorage.exists())) {
            return;
        }

        log.info("Removing shared infrastructure");

        await this.infrastructureStorage.destroy();
    }

    /**
     * Deploys a new database. It will create all the necessary resources in AWS, which can take up to a few minutes.
     *
     * It will also deploy the necessary "shared" infrastructure for all the databases in the same region.
     *
     * !Secret tokens are used to access the database through REST API. They are used to authenticate the requests.
     * You don't need to specify secret tokens while using this library - it will fetch it for you.
     *
     * @param options
     */
    public async createDatabase(options: StoredDatabaseConfiguration & DatabaseID) {
        if (options.secretTokens.length === 0) {
            throw new Error("At least one secret token is required");
        }

        await this.deploySharedInfrastructure();

        const databaseId = {
            name: options.name,
            region: options.region
        };

        const changesStorage = new DynamoChangesStorage({
            databaseId,
            tableName: `multiverse-changes-${options.name}`
        });

        const snapshotStorage = new S3SnapshotStorage({
            bucketName: `multiverse-snapshot-${options.name}`,
            databaseId
        });

        const orchestrator = new LambdaOrchestrator({
            databaseId,
            secretToken: options.secretTokens[0].secret
        });

        log.info(`Creating database ${options.name}`);

        await Promise.all([
            changesStorage.deploy(),
            snapshotStorage.deploy(),
            orchestrator.deploy({
                changesTable: `multiverse-changes-${options.name}`,
                snapshotBucket: `multiverse-snapshot-${options.name}`,
                databaseConfiguration: options,
                infrastructureTable: this.INFRASTRUCTURE_TABLE_NAME
            })
        ]);
    }

    /**
     * Removes the database and all the resources associated with it.
     * Doesn't remove the shared infrastructure.
     * @param name
     */
    public async removeDatabase(name: string) {
        const databaseId = {
            name: name,
            region: this.options.region
        };

        const changesStorage = new DynamoChangesStorage({
            databaseId,
            tableName: `multiverse-changes-${name}`
        });

        const snapshotStorage = new S3SnapshotStorage({
            bucketName: `multiverse-snapshot-${name}`,
            databaseId
        });

        const orchestrator = new LambdaOrchestrator({
            databaseId,
            secretToken: "not needed"
        });

        log.info(`Removing database ${name}`);

        await Promise.all([
            changesStorage.destroy(),
            snapshotStorage.destroy(),
            orchestrator.destroy()
        ]);
    }

    /**
     *
     * @param name
     * @returns Database or undefined if it doesn't exist
     */
    public async getDatabase(name: string): Promise<MultiverseDatabase | undefined> {
        const databaseConfiguration = await this.infrastructureStorage.get(name);

        if (!databaseConfiguration) {
            return undefined;
        }

        return new MultiverseDatabase({
            name,
            region: this.options.region,
            // TODO: find better way to obtain a token?
            secretToken: databaseConfiguration.configuration.secretTokens[0].secret
        });
    }

    public async listDatabases(): Promise<MultiverseDatabase[]> {
        const databases = await this.infrastructureStorage.list();

        return databases.map(database => new MultiverseDatabase({
            name: database.databaseId.name,
            region: this.options.region,
            secretToken: database.configuration.secretTokens[0].secret
        }));
    }
}