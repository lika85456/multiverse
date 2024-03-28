import type {
    DatabaseConfiguration, Region, Token
} from "./DatabaseConfiguration";
import type { Query, QueryResult } from "./core/Query";
import type { NewVector } from "./core/Vector";
import OrchestratorDeployer from "./Orchestrator/OrchestratorDeployer";
import { ENV } from "./env";
import type InfrastructureStorage from "./InfrastructureStorage";
import DynamoInfrastructureStorage from "./InfrastructureStorage/DynamoInfrastructureStorage";

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
    createDatabase(options: Omit<DatabaseConfiguration, "region">): Promise<void>;

    removeDatabase(name: string): Promise<void>;

    getDatabase(name: string): Promise<IMultiverseDatabase | undefined>

    listDatabases(): Promise<IMultiverseDatabase[]>;
}

export class MultiverseDatabase implements IMultiverseDatabase {
    constructor(private configuration: DatabaseConfiguration) {
    }

    public async query(query: Query): Promise<QueryResult> {

    }

    public async add(vector: NewVector[]) {

    }

    public async remove(label: string[]) {

    }

    public async getConfiguration() {
        // TODO read it from db
        return this.configuration;
    }

    public async addToken(token: Token) {

    }

    public async removeToken(tokenName: string) {

    }
}

/**
 * This is the entry for the whole Multiverse library.
 * From here you can manipulate databases. It needs to be initialized with the region and secret token.
 */
export default class Multiverse implements IMultiverse {

    private awsToken: AwsToken;

    private infrastructureStorage: InfrastructureStorage;

    /**
     * Either set the AWS credentials in the environment or provide them here.
     * @param options
     */
    constructor(private options: {
        region: Region,
        awsToken?: AwsToken,

        customChangesStorageName?: string,
        customSnapshotStorageName?: string,
        customInfrastructureStorageName?: string,
    }) {

        if (!options.awsToken && (!ENV.AWS_ACCESS_KEY_ID || !ENV.AWS_SECRET_ACCESS_KEY)) {
            throw new Error("AWS credentials are required");
        }

        this.awsToken = options.awsToken ?? {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            accessKeyId: ENV.AWS_ACCESS_KEY_ID!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY!
        };

        this.infrastructureStorage = new DynamoInfrastructureStorage({
            region: options.region,
            tableName: options.customInfrastructureStorageName ?? "multiverse-infrastructure-storage"
        });
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
    public async createDatabase(options: Omit<DatabaseConfiguration, "region">) {
        if (options.secretTokens.length === 0) {
            throw new Error("At least one secret token is required");
        }

        // TODO: create infrastructure if doesnt exist

        const orchestratorDeployer = new OrchestratorDeployer({
            databaseConfiguration: {
                ...options,
                region: this.options.region
            },
            changesTable: this.options.customChangesStorageName ?? "multiverse-changes-storage",
            snapshotBucket: this.options.customSnapshotStorageName ?? "multiverse-snapshot-storage",
            infrastructureTable: this.options.customInfrastructureStorageName ?? "multiverse-infrastructure-storage",
        });

        await orchestratorDeployer.deploy();
    }

    /**
     * Removes the database and all the resources associated with it.
     * Doesn't remove the shared infrastructure.
     * @param name
     */
    public async removeDatabase(name: string) {

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

        return new MultiverseDatabase(databaseConfiguration.configuration);
    }

    public async listDatabases(): Promise<MultiverseDatabase[]> {
        const databases = await this.infrastructureStorage.list();

        return databases.map(d => new MultiverseDatabase(d.configuration));
    }

    public async removeSharedInfrastructure() {

    }
}