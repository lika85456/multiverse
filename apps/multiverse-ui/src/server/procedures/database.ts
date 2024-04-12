import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { generateHex } from "@/server/multiverse-interface/MultiverseMock";
import type { StoredDatabaseConfiguration } from "@multiverse/multiverse/src/core/DatabaseConfiguration";
import type { DatabaseGet } from "@/lib/mongodb/collections/database";
import { deleteDatabase } from "@/lib/mongodb/collections/database";
import { createDatabase } from "@/lib/mongodb/collections/database";
import { getDatabase } from "@/lib/mongodb/collections/database";
import { vector } from "@/server/procedures/vector";
import { secretToken } from "@/server/procedures/secretToken";
import { TRPCError } from "@trpc/server";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { MultiverseFactory } from "@/server/multiverse-interface/MultiverseFactory";

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

const storeDatabase = async(configuration: StoredDatabaseConfiguration): Promise<DatabaseGet> => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
        });
    }

    const mongodbDatabase = await getDatabase(configuration.name);

    if (!mongodbDatabase) {
        const databaseToInsert = {
            name: configuration.name,
            codeName: configuration.name,
            records: 0,
            ownerId: sessionUser._id
        };

        const result = await createDatabase(databaseToInsert);
        if (!result) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not create the database",
            });
        }

        return {
            ...databaseToInsert,
            dimensions: configuration.dimensions,
            region: configuration.region,
            space: configuration.space,
            secretTokens: configuration.secretTokens
        };
    }

    return {
        codeName: configuration.name,
        name: mongodbDatabase.name,
        region: configuration.region,
        dimensions: configuration.dimensions,
        space: configuration.space,
        secretTokens: configuration.secretTokens
    };
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
        const multiverse = await (new MultiverseFactory()).getMultiverse();
        const listedDatabases = await multiverse.listDatabases();

        try {
            return await Promise.all(listedDatabases.map(async(database): Promise<DatabaseGet> => {
                const configuration = await database.getConfiguration();

                // TODO - check if multiverseDB has queue, if not, set it
                // guaranteed that the database is stored in the mongodb
                return storeDatabase(configuration);
            }));
        } catch (error) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not list the databases",
                cause: error
            });
        }
    }),

    /**
     * Get a database by codeName(== multiverse database name).
     * If the database is not found in the multiverse, return undefined.
     * If the database is found, return the database.
     * @returns {DatabaseGet | undefined} - database
     */
    get: publicProcedure
        .input(z.string())
        .query(async(opts): Promise<DatabaseGet> => {
            const multiverse = await (new MultiverseFactory()).getMultiverse();
            const multiverseDatabase = await multiverse.getDatabase(opts.input);
            const configuration = await multiverseDatabase?.getConfiguration();
            if (!configuration) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Database not found",
                });
            }

            // TODO - check if multiverseDB has queue, if not, set it
            return await storeDatabase(configuration);
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
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "User not found",
            });
        }
        const multiverse = await (new MultiverseFactory()).getMultiverse();
        const name = normalizeDatabaseName(opts.input.name);
        const codeName = generateCodeName(opts.input.name);

        const database: StoredDatabaseConfiguration = {
            name: codeName,
            secretTokens: opts.input.secretTokens,
            dimensions: opts.input.dimensions,
            region: opts.input.region as "eu-central-1",
            space: opts.input.space as "l2" | "cosine" | "ip",
            statisticsQueueName: sessionUser.sqsQueue
        };

        try {
            await multiverse.createDatabase(database);

            const createdDatabase = await createDatabase({
                name: name,
                codeName: codeName,
                ownerId: sessionUser._id
            });
            if (!createdDatabase) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Could not create the database",
                });
            }

            return true;

        } catch (error) {

            return false;
        }
    }),
    /**
     * Delete a database by codeName(== multiverse database name).
     * If the database is not found in the multiverse, return an error.
     * If the database is deleted successfully, it is removed from the mongodb.
     */
    delete: publicProcedure.input(z.string()).mutation(async(opts) => {
        const codeName = opts.input;

        const multiverse = await (new MultiverseFactory()).getMultiverse();
        const multiverseDatabase = await multiverse.getDatabase(codeName);
        if (!multiverseDatabase) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Could not delete the database",
            });
        }

        try {
            await multiverse.removeDatabase(codeName);
            await deleteDatabase(codeName);

            return true;
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