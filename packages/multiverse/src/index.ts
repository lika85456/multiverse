import type {
    DatabaseID, Region, StoredDatabaseConfiguration, Token
} from "./core/DatabaseConfiguration";
import type { Query, QueryResult } from "./core/Query";
import type { NewVector } from "./core/Vector";
import type InfrastructureStorage from "./InfrastructureStorage";
import DynamoInfrastructureStorage from "./InfrastructureStorage/DynamoInfrastructureStorage";
import type Orchestrator from "./Orchestrator/Orchestrator";
import LambdaOrchestrator from "./Orchestrator/LambdaOrchestrator";
import logger from "@multiverse/log";
import DynamoChangesStorage from "./ChangesStorage/DynamoChangesStorage";
import S3SnapshotStorage from "./SnapshotStorage/S3SnapshotStorage";
import type { AwsToken } from "./core/AwsToken";
import BuildBucket from "./BuildBucket/BuildBucket";

const log = logger.getSubLogger({ name: "Multiverse" });

export type { AwsToken } from "./core/AwsToken";

export type MultiverseDatabaseConfiguration = StoredDatabaseConfiguration & DatabaseID;

export interface IMultiverseDatabase {
    query(query: Query): Promise<QueryResult>;

    add(vector: NewVector[]): Promise<void>;

    remove(label: string[]): Promise<void>;

    getConfiguration(): Promise<MultiverseDatabaseConfiguration>;
    updateConfiguration(configuration: MultiverseDatabaseConfiguration): Promise<void>;

    addToken(token: Token): Promise<void>;

    removeToken(tokenName: string): Promise<void>;
}

export interface IMultiverse {
    createDatabase(options: MultiverseDatabaseConfiguration): Promise<void>;

    removeDatabase(name: string): Promise<void>;

    getDatabase(name: string): Promise<IMultiverseDatabase | undefined>

    listDatabases(): Promise<IMultiverseDatabase[]>;

    destroySharedInfrastructure(): Promise<void>;
}

export class MultiverseDatabase implements IMultiverseDatabase {

    private orchestrator: Orchestrator;

    constructor(private options: {
        name: string,
        region: Region,
        secretToken: string,
        awsToken: AwsToken
    }) {
        this.orchestrator = new LambdaOrchestrator({
            databaseId: {
                name: options.name,
                region: options.region
            },
            secretToken: options.secretToken,
            awsToken: this.options.awsToken
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

    public async getConfiguration(): Promise<MultiverseDatabaseConfiguration> {
        return {
            ...await this.orchestrator.getConfiguration(),
            name: this.options.name,
            region: this.options.region
        };
    }

    public async updateConfiguration(_configuration: MultiverseDatabaseConfiguration): Promise<void> {
        // noop
    }

    public async addToken(token: Token) {
        await this.orchestrator.addToken(token);
    }

    public async removeToken(tokenName: string) {
        await this.orchestrator.removeToken(tokenName);
    }
}

/**
 * This is the entry for the whole Multiverse library.
 * From here you can manipulate databases. It needs to be initialized with the region and secret token.
 */
export default class Multiverse implements IMultiverse {

    private infrastructureStorage: InfrastructureStorage;
    private buildBucket: BuildBucket;

    /**
     * Either set the AWS credentials in the environment or provide them here.
     * @param options
     * @param options.region AWS region for primary database
     * @param options.awsToken AWS credentials
     * @param options.name Name of the Multiverse. It will be used as a prefix for all the resources. Useful for staging
     */
    constructor(private options: {
        region: Region,
        awsToken: AwsToken,
        name: string
    }) {
        this.infrastructureStorage = new DynamoInfrastructureStorage({
            region: options.region,
            tableName: `mv-infra-${options.name}`,
            awsToken: this.options.awsToken
        });

        this.buildBucket = new BuildBucket(`mv-build-${this.options.name}`, {
            region: this.options.region,
            awsToken: this.options.awsToken
        });
    }

    private async deploySharedInfrastructure() {
        if (await this.infrastructureStorage.exists()) {
            return;
        }

        log.info("Deploying shared infrastructure");

        await Promise.allSettled([
            this.infrastructureStorage.deploy(),
            this.buildBucket.deploy()
        ]);

        // TODO build and upload orchestrator source to s3
    }

    public async destroySharedInfrastructure() {
        if (!(await this.infrastructureStorage.exists())) {
            return;
        }

        log.info("Removing shared infrastructure");

        await Promise.allSettled([
            this.infrastructureStorage.destroy(),
            this.buildBucket.destroy()
        ]);
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
    public async createDatabase(options: MultiverseDatabaseConfiguration) {
        // TODO!: secret token should not be needed here, because aws token cou
        if (options.secretTokens.length === 0) {
            throw new Error("At least one secret token is required");
        }

        // TODO If fails remove the rest

        await this.deploySharedInfrastructure();

        const databaseId = {
            name: options.name,
            region: options.region
        };

        // todo changes storage should be shared
        const changesStorage = new DynamoChangesStorage({
            databaseId,
            tableName: `mv-changes-${options.name}`,
            awsToken: this.options.awsToken
        });

        const snapshotStorage = new S3SnapshotStorage({
            bucketName: `mv-snapshot-${options.name}`,
            databaseId,
            awsToken: this.options.awsToken
        });

        const orchestrator = new LambdaOrchestrator({
            databaseId,
            secretToken: options.secretTokens[0].secret,
            awsToken: this.options.awsToken
        });

        log.info(`Creating database ${options.name}`);

        const promises = [
            changesStorage.deploy(),
            snapshotStorage.deploy(),
            orchestrator.deploy({
                changesTable: changesStorage.getResourceName(),
                snapshotBucket: snapshotStorage.getResourceName(),
                buildBucket: this.buildBucket.getResourceName(),
                databaseConfiguration: options,
                infrastructureTable: this.infrastructureStorage.getResourceName(),
                scalingTargetConfiguration: {
                    warmPrimaryInstances: 10,
                    warmRegionalInstances: 0,
                    warmSecondaryInstances: 0,
                    secondaryFallbacks: 0,
                    outOfRegionFallbacks: 0
                }
            })
        ];

        try {
            await Promise.all(promises);
        } catch (e) {
            // wait untill all finished but catch
            await Promise.all(promises.map(p => p.catch((e) => log.error(e))));

            await Promise.all([
                changesStorage.destroy().catch((e) => log.error(e)),
                snapshotStorage.destroy().catch((e) => log.error(e)),
                orchestrator.destroy().catch((e) => log.error(e))
            ]);

            throw e;
        }
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
            tableName: `mv-changes-${name}`,
            awsToken: this.options.awsToken
        });

        const snapshotStorage = new S3SnapshotStorage({
            bucketName: `mv-snapshot-${name}`,
            databaseId,
            awsToken: this.options.awsToken
        });

        const orchestrator = new LambdaOrchestrator({
            databaseId,
            secretToken: "not needed",
            awsToken: this.options.awsToken
        });

        log.info(`Removing database ${name}`);

        const oldInfrastructure = await this.infrastructureStorage.get(name);
        if (!oldInfrastructure) {
            throw new Error(`Database ${name} not found`);
        }

        await this.infrastructureStorage.remove(name);

        try {

            await Promise.all([
                changesStorage.destroy(),
                snapshotStorage.destroy(),
                orchestrator.destroy()
            ]);
        } catch (e) {
            log.error(e);
            await this.infrastructureStorage.set(name, oldInfrastructure);
        }
    }

    /**
     *
     * @param name
     * @returns Database or undefined if it doesn't exist
     */
    public async getDatabase(name: string): Promise<MultiverseDatabase | undefined> {
        await this.deploySharedInfrastructure();
        try {
            const databaseConfiguration = await this.infrastructureStorage.get(name);

            if (!databaseConfiguration) {
                return undefined;
            }

            return new MultiverseDatabase({
                name,
                region: this.options.region,
                // TODO: find better way to obtain a token?
                secretToken: databaseConfiguration.configuration.secretTokens[0].secret,
                awsToken: this.options.awsToken
            });
        } catch (e) {
            log.error(e);
        }

        return undefined;
    }

    public async listDatabases(): Promise<MultiverseDatabase[]> {
        await this.deploySharedInfrastructure();

        const databases = await this.infrastructureStorage.list();

        return databases.map(database => new MultiverseDatabase({
            name: database.databaseId.name,
            region: this.options.region,
            secretToken: database.configuration.secretTokens[0].secret,
            awsToken: this.options.awsToken
        }));
    }
}