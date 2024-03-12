import type {
    DatabaseConfiguration, Region, Token
} from "./DatabaseConfiguration";
import type { Query, QueryResult } from "./Database/Query";
import type { NewVector } from "./Vector";
import OrchestratorDeployer from "./Orchestrator/OrchestratorDeployer";

export class MultiverseDatabase {
    constructor(private configuration: DatabaseConfiguration & {
        secretToken: Token
    }) {
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

export default class Multliverse {

    // don't forget to add the region to the options

    constructor(private options: {
        region: Region,
        secretTokens: Token[],
        customChangesStorageName?: string,
        customSnapshotStorageName?: string,
        customInfrastructureStorageName?: string,
    }) {
        if (options.secretTokens.length === 0) {
            throw new Error("At least one secret token is required");
        }
    }

    public async createDatabase(options: Omit<DatabaseConfiguration, "region">) {
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

    public async removeDatabase(name: string) {

    }

    public async getDatabase(name: string): Promise<MultiverseDatabase> {

    }

    public async listDatabases(): Promise<MultiverseDatabase[]> {

    }
}