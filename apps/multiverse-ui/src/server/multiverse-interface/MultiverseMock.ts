import type { DatabaseConfiguration, Token } from "./DatabaseConfiguration";
import type { Query, QueryResult } from "./core/Query";
import type { NewVector } from "./core/Vector";
import type { IMultiverseDatabase } from "@multiverse/multiverse";

class MultiverseDatabaseMock implements IMultiverseDatabase {
    constructor(private configuration: DatabaseConfiguration) {}

    public async query(query: Query): Promise<QueryResult> {
        console.log(query);

        return { data: [] };
    }

    public async add(vector: NewVector[]) {
        console.log(vector);

        return;
    }

    public async remove(label: string[]) {
        console.log(label);

        return;
    }

    public async getConfiguration() {
        return this.configuration;
    }

    public async addToken(token: Token) {
        console.log(token);

        return;
    }

    public async removeToken(tokenName: string) {
        console.log(tokenName);

        return;
    }
}

class MockMultiverse implements IMultiverse {
    public async createDatabase(options: Omit<DatabaseConfiguration, "region">) {
        console.log(options);

        return;
    }

    public async removeDatabase(name: string) {
        console.log(name);

        return;
    }

    public async getDatabase(name: string) {
        console.log(name);

        return;
    }

    public async listDatabases() {
        return [];
    }
}