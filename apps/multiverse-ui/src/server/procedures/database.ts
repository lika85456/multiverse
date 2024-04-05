import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { MultiverseMock } from "@/server/multiverse-interface/MultiverseMock";
import type { DatabaseConfiguration } from "@multiverse/multiverse/src/DatabaseConfiguration";
import type { DatabaseGet } from "@/lib/mongodb/collections/database";
import { vector } from "@/server/procedures/vector";

export const database = router({
    list: publicProcedure.query(async(): Promise<DatabaseGet[]> => {
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
                secretTokens: configuration.secretTokens
            };
        })) ;
    }),
    get: publicProcedure
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
                secretTokens: configuration.secretTokens
            };
        }),

    post: publicProcedure.input(z.object({
        name: z.string(),
        secretTokens: z.array(z.object({
            name: z.string(),
            secret: z.string(),
            validUntil: z.number(),
        })),
        dimensions: z.number(),
        region: z.string(),
        space: z.string(),
    })).mutation(async(opts) => {
        const multiverse = new MultiverseMock();

        const database: DatabaseConfiguration = {
            name: opts.input.name,
            secretTokens: opts.input.secretTokens,
            dimensions: opts.input.dimensions,
            region: opts.input.region as "eu-central-1",
            space: opts.input.space as "l2" | "cosine" | "ip"
        };

        try {
            await multiverse.createDatabase(database);

            return true;
        } catch (error) {
            console.log(error);

            return false;
        }
    }),
    vector
});