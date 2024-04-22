import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb/mongodb";
import { getDatabase } from "@/lib/mongodb/collections/database";
import type { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";

export const collectionName = "general_database_statistics";

export interface GeneralDatabaseStatisticsGet{
    _id: ObjectId;
    // unique, identifies general statistics for a database
    databaseName: string;
    // statistics data
    updated: UTCDate; // for data freshness comparison
    dataSize: number;
    totalVectors: number;
}

export interface GeneralDatabaseStatisticsInsert{
    // unique, identifies general statistics for a database
    databaseName: string;
    // statistics data
    updated: UTCDate; // for data freshness comparison
    dataSize: number;
    totalVectors: number;
}

/**
 * Get general statistics for a database
 * @param databaseName - name of the database to get statistics for
 * @returns {GeneralDatabaseStatisticsGet} - the general statistics
 * @returns {undefined} - if the general statistics do not exist
 */
export const getGeneralDatabaseStatistics = async(databaseName: string): Promise<GeneralDatabaseStatisticsGet | undefined> => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection<GeneralDatabaseStatisticsGet>(collectionName).findOne({ databaseName });

        if (!result) {
            log.debug(`General database statistics for database ${databaseName} not found in mongodb`);

            return undefined;
        }

        return {
            _id: result._id,
            databaseName: result.databaseName,
            updated: result.updated,
            dataSize: result.dataSize,
            totalVectors: result.totalVectors,
        };

    } catch (error) {
        log.error(error);
        throw new Error("Error getting general database statistics");
    }
};

/**
 * Add general statistics for a database
 * @param statistics - the general statistics to add
 */
export const addGeneralDatabaseStatistics = async(statistics: GeneralDatabaseStatisticsInsert): Promise<void> => {
    const database = (await getDatabase(statistics.databaseName));
    if (!database) {
        log.info(`Database ${statistics.databaseName} not found, not adding general database statistics`);

        return;
    }
    const getStatisticsResult = await getGeneralDatabaseStatistics(statistics.databaseName);

    try {
        const client = await clientPromise;
        const db = client.db();

        if (!getStatisticsResult) {
            // general statistics don't exist for this database, create new statistics
            await db.collection<GeneralDatabaseStatisticsInsert>(collectionName).insertOne(statistics);
            log.info(`Created general database statistics for database ${statistics.databaseName} in mongodb`);

            return;
        }
        // general statistics exist for this database
        if (statistics.updated.getTime() > getStatisticsResult.updated.getTime()) {
            // update if the latest write event is newer
            await db.collection<GeneralDatabaseStatisticsGet>(collectionName)
                .updateOne({ databaseName: statistics.databaseName }, { $set: statistics });
            log.info(`Updated general database statistics for database ${statistics.databaseName} in mongodb`);

            return;
        }
        // don't update otherwise
    } catch (error) {
        log.error(error);
        throw new Error("Error adding general database statistics");
    }
};

/**
 * Remove general statistics for a database
 * @param databaseName - name of the database to remove statistics for
 * @throws {Error} if the general statistics could not be removed
 * @throws {Error} if the general statistics do not exist
 */
export const removeGeneralDatabaseStatistics = async(databaseName: string): Promise<void> => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection<GeneralDatabaseStatisticsGet>(collectionName).deleteOne({ databaseName });
        if (!result.acknowledged) {
            throw new Error("General database statistics not removed");
        }
        if (result.deletedCount === 0) {
            throw new Error(`No general statistics for database ${databaseName} removed`);
        }
        if (result.deletedCount > 1) {
            log.error("More than one general database statistics was deleted, this should not happen");
        }
        log.info(`Removed general database statistics for database ${databaseName} from mongodb`);
    } catch (error) {
        log.error(error);
        throw new Error("Error removing general database statistics");
    }
};