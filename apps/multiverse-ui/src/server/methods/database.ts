import { publicProcedure } from "@/server/trpc";
import z from "zod";
import { MultiverseMock } from "@/server/multiverse-interface/MultiverseMock";
import type { DatabaseConfiguration } from "@multiverse/multiverse/src/DatabaseConfiguration";
import type { DatabaseGet } from "@/lib/mongodb/collections/database";

export const databaseMethods = {
    getDatabases: publicProcedure.query(async(): Promise<DatabaseGet[]> => {
        const multiverse = new MultiverseMock();
        const multiverseDatabases = await multiverse.listDatabases();

        return await Promise.all(multiverseDatabases.map(async(database): Promise<DatabaseGet> => {
            const configuration = await database.getConfiguration();

            return {
                name: configuration.name,
                codeName: configuration.name,
                region: configuration.region,
                dimensions: configuration.dimensions,
                space: configuration.space,
            };
        })) ;
    }),
    getDatabaseByCodeName: publicProcedure
        .input(z.string())
        .query(async(opts): Promise<DatabaseGet | undefined> => {
            const multiverse = new MultiverseMock();
            const multiverseDatabase = await multiverse.getDatabase(opts.input);
            const configuration = await multiverseDatabase?.getConfiguration();
            if (!configuration) {
                return undefined;
            }

            return {
                name: configuration.name,
                codeName: configuration.name,
                region: configuration.region,
                dimensions: configuration.dimensions,
                space: configuration.space,
            };
        }),

    createDatabase: publicProcedure.mutation(async(opts) => {
        const multiverse = new MultiverseMock();

        const database: DatabaseConfiguration = {
            name: "test",
            secretTokens: [
                {
                    name: "token1",
                    secret: "secretsecret",
                    validUntil: 12345678,
                },
            ],
            dimensions: 1536,
            region: "eu-central-1",
            space: "l2",
        };

        await multiverse.createDatabase(database);
    }),
};