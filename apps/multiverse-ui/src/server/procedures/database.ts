import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { generateHex } from "@/server/multiverse-interface/MultiverseMock";
import type { DatabaseFindMongoDb, DatabaseGet } from "@/lib/mongodb/collections/database";
import {
    createDatabase, deleteDatabase, EDatabaseState, getDatabase
} from "@/lib/mongodb/collections/database";
import { vector } from "@/server/procedures/vector";
import { secretToken } from "@/server/procedures/secretToken";
import { TRPCError } from "@trpc/server";
import type { UserGet } from "@/lib/mongodb/collections/user";
import {
    addDatabaseToBeCreatedToUser,
    addDatabaseToBeDeletedToUser,
    getSessionUser,
    removeDatabaseToBeCreatedFromUser,
    removeDatabaseToBeDeletedFromUser
} from "@/lib/mongodb/collections/user";
import { MultiverseFactory } from "@/server/multiverse-interface/MultiverseFactory";
import log from "@multiverse/log";
import { handleError } from "@/server";
import type { ObjectId } from "mongodb";
import { getGeneralDatabaseStatistics } from "@/lib/mongodb/collections/general-database-statistics";
import type { MultiverseDatabaseConfiguration } from "@multiverse/multiverse/src";

export const MAX_DB_CODE_NAME_LENGTH = 24;
export const MAX_DB_NAME_LENGTH = 64;

/**
 * Normalize a string by trimming and removing special characters.
 * The length of the normalized string can be specified (default is 64).
 * @throws {TRPCError} - if the string is empty
 * @param str
 * @param length
 */
export const normalizeString = (str: string, length = MAX_DB_NAME_LENGTH): string => {
    const normalized = str.trim().replace(/[^0-9a-zA-Z ]/gi, "").slice(0, length);
    if (normalized.length === 0) {
        log.error("Invalid string provided");
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid string provided",
        });
    }

    return normalized;
};

/**
 * Convert a string to an alphanumeric string.
 * @throws {TRPCError} - if the string is empty
 * @param str
 */
const stringToAlphaNumeric = (str: string): string => {
    const noSpaces = str.trim().split(" ").join("_");
    if (noSpaces.length === 0) {
        log.error("Cannot convert to alpha numeric, invalid string provided");
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot convert to alpha numeric, invalid string provided",
        });
    }

    return noSpaces.replace(/[^0-9a-z_]/gi, "").toLowerCase();
};

/**
 * Generate a database code name.
 * @param name
 */
const generateDatabaseCodeName = (name: string): string => {
    const slicedAlphanumericalName = stringToAlphaNumeric(name).slice(0, 12);

    return `${slicedAlphanumericalName}_${generateHex(MAX_DB_CODE_NAME_LENGTH - slicedAlphanumericalName.length - 1)}`;
};

/**
 * Check if the user has access to the database.
 * @throws {TRPCError} - if the user is not found or does not have access to the database
 * @param databaseCodeName
 */
export const checkAccessToDatabase = async(databaseCodeName: string): Promise<{
    sessionUser: UserGet,
    database: DatabaseFindMongoDb
}> => {
    const database = await getDatabase(databaseCodeName);
    if (!database) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Database ${databaseCodeName} was not found`,
        });
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        log.error("User is not authenticated");
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User is not authenticated",
        });
    }
    if (!sessionUser.databases || !sessionUser.databases.includes(databaseCodeName)) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: `User ${sessionUser.email} does not have access to database ${databaseCodeName}`,
        });
    }

    return {
        sessionUser,
        database
    };
};

/**
 * Get the related database by code name with access check.
 * @throws {TRPCError} - if the database is not found or the user does not have access to it
 * @param codeName
 */
export const getRelatedDatabase = async(codeName: string) => {
    const { sessionUser, database } = await checkAccessToDatabase(codeName);
    const multiverse = await (new MultiverseFactory()).getMultiverse();
    const multiverseDatabase = await multiverse.getDatabase(codeName);
    if (!multiverseDatabase) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Database ${codeName} was not found`,
        });
    }

    return {
        multiverseDatabase,
        sessionUser,
        database
    };
};

/**
 * Store the database in the mongodb.
 * If the database is not found in the mongodb, it is created.
 * If the database is found in the mongodb, it is returned combined with the configuration.
 * @throws {TRPCError} - if the user is not found or the database could not be created
 * @param configuration
 */
const storeDatabase = async(configuration: MultiverseDatabaseConfiguration): Promise<DatabaseGet> => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        log.error("User is not authenticated");
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User is not authenticated",
        });
    }

    const mongodbDatabase = await getDatabase(configuration.name);

    // create the database in the mongodb if it does not exist
    if (!mongodbDatabase) {
        const databaseToInsert = {
            name: configuration.name,
            codeName: configuration.name,
            records: 0, // records will be updated after the first write into the queue
            ownerId: sessionUser._id,
        };

        const result = await createDatabase(databaseToInsert);
        if (!result) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Could not create the database ${configuration.name} in mongodb`,
            });
        }
        const resultDatabase = {
            ...databaseToInsert,
            dimensions: configuration.dimensions,
            region: configuration.region,
            space: configuration.space,
            secretTokens: configuration.secretTokens
        };

        log.info("Database created in mongoDB", JSON.stringify(resultDatabase, null, 2));

        return resultDatabase;
    }

    const records = (await getGeneralDatabaseStatistics(configuration.name))?.totalVectors ?? 0 ;

    // log.debug("Database found", JSON.stringify({
    //         ...configuration,
    //         ...mongodbDatabase,
    //         records
    //     }, null, 2));

    // guaranteed that the database is stored in the mongodb, return the database combined with the configuration
    return {
        ...configuration,
        ...mongodbDatabase,
        records
    };
};

export const database = router({
    /**
     * List all databases.
     * First, the databases are obtained from the multiverse,
     * then the databases are checked if they are defined in the mongodb.
     * Missing databases are added to the mongodb with name and codeName set to multiverse database name.
     * @returns {DatabaseGet[]} - list of databases
     */
    list: publicProcedure.query(async(): Promise<{
        databases: DatabaseGet[],
        dbsToBeCreated: string[],
        dbsToBeDeleted: string[]
    }> => {
        try {
            const sessionUser = await getSessionUser();
            if (!sessionUser) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "User is not authenticated",
                });
            }

            const dbsToBeCreated = sessionUser.dbsToBeCreated || [];
            const dbsToBeDeleted = sessionUser.dbsToBeDeleted || [];

            const multiverse = await (new MultiverseFactory()).getMultiverse();
            const listedDatabases = await multiverse.listDatabases();

            const databases = (await Promise.all(listedDatabases.map(async(database): Promise<(DatabaseGet | undefined)> => {
                const configuration = await database.getConfiguration();

                // check if database is being created or deleted
                if (dbsToBeCreated.includes(configuration.name)) {
                    return undefined;
                }
                if (dbsToBeDeleted.includes(configuration.name)) {
                    return undefined;
                }

                if (configuration.statisticsQueueName === undefined) {
                    log.info(`Setting queue ${sessionUser.sqsQueue} to the existing database ${configuration.name}`);
                    configuration.statisticsQueueName = sessionUser.sqsQueue;
                    // TODO - set the queue to the multiverseDB
                }

                // guaranteed that the database is stored in the mongodb
                return await storeDatabase(configuration);
            }))).filter(database => database !== undefined) as DatabaseGet[];

            return {
                databases: databases,
                dbsToBeCreated,
                dbsToBeDeleted
            };

        } catch (error) {
            throw handleError({
                error,
                errorMessage: "Error listing databases",
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
        .query(async(opts): Promise<{
            database: DatabaseGet | undefined,
            state: EDatabaseState
        }> => {
            try {
                const { sessionUser } = await checkAccessToDatabase(opts.input);

                // check if database is being created or deleted
                if (sessionUser.databases && sessionUser.dbsToBeCreated.includes(opts.input)) {
                    return {
                        database: undefined,
                        state: EDatabaseState.CREATING
                    };
                }
                if (sessionUser.databases && sessionUser.dbsToBeDeleted.includes(opts.input)) {
                    return {
                        database: undefined,
                        state: EDatabaseState.DELETING
                    };
                }

                // get the database from the multiverse
                const multiverse = await (new MultiverseFactory()).getMultiverse();
                const multiverseDatabase = await multiverse.getDatabase(opts.input);
                const configuration = await multiverseDatabase?.getConfiguration();
                if (!configuration) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `Database ${opts.input} not found`,
                    });
                }
                if (configuration.statisticsQueueName === undefined) {
                    log.info(`Setting queue ${sessionUser.sqsQueue} to the existing database ${configuration.name}`);
                    configuration.statisticsQueueName = sessionUser.sqsQueue;
                    // TODO - set the queue to the multiverseDB
                }

                const storedDatabase = await storeDatabase(configuration);

                return {
                    database: storedDatabase,
                    state: EDatabaseState.CREATED
                };
            } catch (error) {
                throw handleError({
                    error,
                    errorMessage: "Error getting database",
                    logMessage: `Error getting database ${opts.input}`,
                });
            }
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
        let codeName = "";

        try {
            codeName = generateDatabaseCodeName(opts.input.name);
            const name = opts.input.name;

            // add the database to the user's list of databases to be created
            await addDatabaseToBeCreatedToUser(sessionUser._id, codeName);

            const multiverse = await (new MultiverseFactory()).getMultiverse();

            // create the database in the multiverse
            const database: MultiverseDatabaseConfiguration = {
                name: codeName,
                secretTokens: opts.input.secretTokens,
                dimensions: opts.input.dimensions,
                region: opts.input.region as "eu-central-1",
                space: opts.input.space as "l2" | "cosine" | "ip",
                statisticsQueueName: sessionUser.sqsQueue
            };
            await multiverse.createDatabase(database);

            // store the database in the mongodb
            await createDatabase({
                name: name,
                codeName: codeName,
                ownerId: sessionUser._id
            });
        } catch (error) {
            throw handleError({
                error,
                errorMessage: "Error creating database",
                logMessage: `Error creating database ${opts.input.name}`,
            });
        } finally {
            await removeDatabaseToBeCreatedFromUser(sessionUser._id, codeName);
        }
    }),
    /**
     * Delete a database by codeName(== multiverse database name).
     * If the database is not found in the multiverse, return an error.
     * If the database is deleted successfully, it is removed from the mongodb.
     */
    delete: publicProcedure.input(z.string()).mutation(async(opts) => {
        const codeName = opts.input;
        let userId: ObjectId | undefined = undefined;

        try {
            const { sessionUser } = await checkAccessToDatabase(codeName);
            userId = sessionUser._id;

            // add the database to the user's list of databases to be deleted
            await addDatabaseToBeDeletedToUser(userId, codeName);

            const multiverse = await (new MultiverseFactory()).getMultiverse();
            const multiverseDatabase = await multiverse.getDatabase(codeName);
            if (!multiverseDatabase) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `Database ${codeName} not found`,
                });
            }
            await multiverse.removeDatabase(codeName);
            await deleteDatabase(codeName);
            log.info(`Database ${codeName} deleted`);

            return true;
        } catch (error) {
            throw handleError({
                error,
                errorMessage: "Error deleting database",
                logMessage: `Error deleting database ${codeName}`,
            });
        } finally {
            if (userId) {
                await removeDatabaseToBeDeletedFromUser(userId, codeName);
            }
        }
    }),
    vector,
    secretToken
});