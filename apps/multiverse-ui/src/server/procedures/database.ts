import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { generateHex, MultiverseMock } from "@/server/multiverse-interface/MultiverseMock";
import type { DatabaseConfiguration } from "@multiverse/multiverse/src/DatabaseConfiguration";
import type { DatabaseGet } from "@/lib/mongodb/collections/database";
import { vector } from "@/server/procedures/vector";
import { secretToken } from "@/server/procedures/secretToken";
import { TRPCError } from "@trpc/server";

const normalizeDatabaseName = (str: string): string => {
    return str.trim().replace(/[^0-9a-z ]/gi, "").slice(0, 64);
};

const dbNameToAlphaNumeric = (str: string): string => {
    const noSpaces = str.trim().split(" ").join("_");
    const noSpecialChars = noSpaces.replace(/[^0-9a-z_]/gi, "");

    return noSpecialChars.toLowerCase();
};

const generateCodeName = (name: string): string => {
    const slicedAlphanumericalName = dbNameToAlphaNumeric(name).slice(0, 12);

    return `${slicedAlphanumericalName}_${generateHex(MAX_DB_NAME_LENGTH - slicedAlphanumericalName.length - 1)}`;
};

export const MAX_DB_NAME_LENGTH = 24;

export const database = router({
    /**
     * List all databases.
     * First, the databases are obtained from the multiverse,
     * then the databases are checked if they are defined in the mongodb.
     * Missing databases are added to the mongodb with name and codeName set to multiverse database name.
     * @returns {DatabaseGet[]} - list of databases
     */
    list: publicProcedure.query(async(): Promise<DatabaseGet[]> => {
        const multiverse = new MultiverseMock();
        const listedDatabases = await multiverse.listDatabases();

        return await Promise.all(listedDatabases.map(async(database): Promise<DatabaseGet> => {
            const configuration = await database.getConfiguration();

            //TODO - check if the databases are defined in the mongodb, if not, add them
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

    /**
     * Get a database by codeName(== multiverse database name).
     * If the database is not found in the multiverse, return undefined.
     * If the database is found, return the database.
     * @returns {DatabaseGet | undefined} - database
     */
    get: publicProcedure
        .input(z.string())
        .query(async(opts): Promise<DatabaseGet | undefined> => {
            const multiverse = new MultiverseMock();
            const multiverseDatabase = await multiverse.getDatabase(opts.input);
            const configuration = await multiverseDatabase?.getConfiguration();
            if (!configuration) {
                return undefined;
            }
            // database is defined in the multiverse
            //TODO - check if the database is defined in the mongodb, if not, add it (name = codeName = codeName)

            return {
                name: configuration.name,
                codeName: configuration.name,
                region: configuration.region,
                dimensions: configuration.dimensions,
                space: configuration.space,
                secretTokens: configuration.secretTokens
            };
        }),

    /**
     * Create a new database.
     * The database is created in the multiverse.
     * If the database is created successfully, it is saved to the mongodb.
     */
    post: publicProcedure.input(z.object({
        name: z.string().max(64),
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
        const name = normalizeDatabaseName(opts.input.name);
        console.log(name);
        const codeName = generateCodeName(opts.input.name);

        const database: DatabaseConfiguration = {
            name: codeName,
            secretTokens: opts.input.secretTokens,
            dimensions: opts.input.dimensions,
            region: opts.input.region as "eu-central-1",
            space: opts.input.space as "l2" | "cosine" | "ip"
        };

        try {
            await multiverse.createDatabase(database);

            // const createDatabase = await multiverse.createDatabase(database);
            // TODO save the database to the mongodb with provided name and returned codeName
            return true;

        } catch (error) {
            console.log(error);

            return false;
        }
    }),
    /**
     * Delete a database by codeName(== multiverse database name).
     * If the database is not found in the multiverse, return an error.
     * If the database is deleted successfully, it is removed from the mongodb.
     */
    delete: publicProcedure.input(z.string()).mutation(async(opts) => {
        const multiverse = new MultiverseMock();
        const multiverseDatabase = await multiverse.getDatabase(opts.input);
        if (!multiverseDatabase) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Could not delete the database",
            });
        }

        try {
            await multiverse.removeDatabase(opts.input);
            // TODO remove the database from the mongodb
        } catch (error) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not delete the database",
                cause: error
            });
        }
    }),
    vector,
    secretToken
});