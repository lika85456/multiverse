import clientPromise from "@/lib/mongodb/mongodb";
import type { ObjectId } from "mongodb";
import {
    addDatabaseToUser, getUserById, removeAllDatabaseFromUser, removeDatabaseFromUser
} from "@/lib/mongodb/collections/user";
import { removeAllDailyStatisticsForDatabase } from "@/lib/mongodb/collections/daily-statistics";
import {
    addGeneralDatabaseStatistics, getGeneralDatabaseStatistics,
    removeGeneralDatabaseStatistics
} from "@/lib/mongodb/collections/general-database-statistics";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";

export interface SecretToken {
    name: string;
    secret: string;
    validUntil: number;
}

export interface DatabaseGet {
  codeName: string;
  name: string;
  region: string;
  records: number;
  dimensions: number;
  space: "l2" | "cosine" | "ip";
  secretTokens: SecretToken[];
}

export interface DatabaseFindMongoDb {
    _id: ObjectId;
    name: string;
    codeName: string;
    records: number;
    ownerId: ObjectId;
}

export interface DatabaseInsertMongoDb {
    name: string;
    codeName: string;
    ownerId: ObjectId;
}

/**
 * Get a database by its codeName
 * @param codeName
 * @returns {DatabaseFindMongoDb} - the database
 * @returns {undefined} - if the database does not exist
 */
export const getDatabase = async(codeName: string): Promise<DatabaseFindMongoDb | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("databases").findOne({ codeName });
        if (!result) {
            return undefined;
        }

        const resultGeneralStatistics = await getGeneralDatabaseStatistics(result.codeName);

        return {
            _id: result._id,
            name: result.name,
            codeName: result.codeName,
            records: resultGeneralStatistics?.totalVectors ?? 0,
            ownerId: result.ownerId,
        };
    } catch (error) {
        log.error(error);
        throw new Error(`Error getting database ${codeName}`);
    }
};

/**
 * Create a new database. The database is added to the user's list of databases.
 * @param databaseData - the data of the database to create
 * @returns {ObjectId} - the id of the created database
 * @throws {Error} - if the database could not be created
 */
export const createDatabase = async(databaseData: DatabaseInsertMongoDb): Promise<ObjectId> => {
    const client = await clientPromise;
    const session = client.startSession();
    const db = client.db();

    try {
        return await session.withTransaction(async() => {
            const resultDatabase = await db.collection("databases").insertOne({ ...databaseData });
            if (!resultDatabase.acknowledged) {
                throw new Error("Database not created");
            }
            const database = await db.collection("databases").findOne({ _id: resultDatabase.insertedId });
            if (!database) {
                throw new Error("Database not found");
            }
            await addDatabaseToUser(databaseData.ownerId, database.codeName);
            await addGeneralDatabaseStatistics({
                databaseName: database.codeName,
                updated: new UTCDate(),
                dataSize: 0,
                totalVectors: 0,
            });

            return resultDatabase.insertedId;
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        log.error(error);
        throw new Error(`Error creating database ${databaseData.codeName}`);
    } finally {
        await session.endSession();
    }
};

/**
 * Delete a database. The database is removed from the user's list of databases.
 * All statistics for the database are removed.
 * @throws {Error} - if the database could not be deleted
 * @throws {Error} - if the database does not exist
 * @throws {Error} - if the database could not be removed from the user
 * @throws {Error} - if the statistics for the database could not be removed
 * @throws {Error} - if the general statistics for the database could not be removed
 * @param codeName
 */
export const deleteDatabase = async(codeName: string): Promise<void> => {
    const client = await clientPromise;
    const session = client.startSession();
    const db = (await clientPromise).db();
    try {
        await session.withTransaction(async() => {
            const database = await db.collection("databases").findOne({ codeName });
            if (!database) {
                throw new Error("Database not found");
            }
            //remove existing database
            const result = await db.collection("databases").deleteOne({ codeName });
            if (!result.acknowledged) {
                throw new Error("Database deletion not acknowledged");
            }
            if (result.deletedCount > 1) {
                log.error("More than one database was deleted, this should not happen");
            }
            if (result.deletedCount === 0) {
                throw new Error("No database was deleted, this should not happen");
            }

            //remove database from user's list of databases
            await removeDatabaseFromUser(database?.ownerId, database.codeName);
            //remove all statistics for the database
            await removeAllDailyStatisticsForDatabase(database.codeName);
            await removeGeneralDatabaseStatistics(database.codeName);

            log.info(`Database successfully ${database.codeName} deleted`);
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        log.error(error);
        throw new Error("Error deleting database");
    } finally {
        await session.endSession();
    }
};

/**
 * Delete all databases of a user. All statistics for the databases are removed.
 * @throws {Error} - if the user does not exist
 * @throws {Error} - if the databases could not be deleted
 * @throws {Error} - if the databases could not be removed from the user
 * @throws {Error} - if the statistics for the databases could not be removed
 * @throws {Error} - if the general statistics for the databases could not be removed
 * @param ownerId
 */
export const deleteAllDatabases = async(ownerId: ObjectId) => {
    const client = await clientPromise;
    const session = client.startSession();
    const db = client.db();

    try {
        return await session.withTransaction(async() => {
            const ownerResult = await getUserById(ownerId);
            if (!ownerResult) {
                throw new Error("Owner not found");
            }
            const databases: string[] = ownerResult.databases;
            if (!databases || databases.length === 0) {
                log.info(`No databases to delete for user ${ownerResult.email}`);

                return;
            }

            // remove all daily statistics for all databases of the user and his general statistics
            await Promise.all(databases.map(async(database) => {
                await removeAllDailyStatisticsForDatabase(database);
                await removeGeneralDatabaseStatistics(database);
            }));

            // remove all databases
            const result = await db.collection("databases").deleteMany({ ownerId });
            if (!result.acknowledged) {
                throw new Error(`Databases not deleted for user ${ownerResult.email}`);
            }
            // remove all databases from user
            const resultUser = removeAllDatabaseFromUser(ownerId);
            if (!resultUser) {
                throw new Error(`Databases not deleted from user ${ownerResult.email}`);
            }

            log.info(`All databases deleted for user ${ownerResult.email}`);
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        log.error(error);
        throw new Error(`Error deleting all databases for user ${ownerId}`);
    } finally {
        await session.endSession();
    }
};