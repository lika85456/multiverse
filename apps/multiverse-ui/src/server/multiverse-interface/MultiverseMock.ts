import type { IMultiverse, IMultiverseDatabase } from "@multiverse/multiverse/src";

import type { DatabaseConfiguration, Token } from "@multiverse/multiverse/src/DatabaseConfiguration";
import type { Query, QueryResult } from "@multiverse/multiverse/src/core/Query";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";

class MultiverseDatabaseMock implements IMultiverseDatabase {
    add(vector: NewVector[]): Promise<void> {
        console.log(vector);

        return Promise.resolve(undefined);
    }

    addToken(token: Token): Promise<void> {
        console.log(token);

        return Promise.resolve(undefined);
    }

    getConfiguration(): Promise<DatabaseConfiguration> {
        const databaseConfiguration: DatabaseConfiguration = {
            name: "databazen",
            secretTokens: [{
                name: "token1",
                secret: "secret1",
                validUntil: new Date().getMilliseconds()
            }],
            dimensions: 1536,
            region: "eu-central-1",
            space: "cosine"
        };

        return Promise.resolve(databaseConfiguration);
    }

    query(query: Query): Promise<QueryResult> {
        console.log(query);
        const result: QueryResult = {
            result: [{
                label: "label",
                metadata: {},
                vector: [0, 0, 0, 0],
                distance: 1
            }]
        };

        return Promise.resolve(result);
    }

    remove(label: string[]): Promise<void> {
        console.log(label);

        return Promise.resolve();
    }

    removeToken(tokenName: string): Promise<void> {
        console.log(tokenName);

        return Promise.resolve();
    }
}

export class MultiverseMock implements IMultiverse {
    createDatabase(options: Omit<DatabaseConfiguration, "region">): Promise<void> {
        console.log(options);

        return Promise.resolve();
    }

    getDatabase(name: string): Promise<IMultiverseDatabase | undefined> {
        console.log(name);

        return Promise.resolve(new MultiverseDatabaseMock() as IMultiverseDatabase);
    }

    listDatabases(): Promise<IMultiverseDatabase[]> {
        return Promise.resolve([]);
    }

    removeDatabase(name: string): Promise<void> {
        console.log(name);

        return Promise.resolve();
    }

}