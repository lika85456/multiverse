import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb/mongodb";
import { getDatabase } from "@/lib/mongodb/collections/database";

export const collectionName = "general_database_statistics";

export interface GeneralDatabaseStatisticsGet{
    _id: ObjectId;
    // unique, identifies general statistics for a database
    databaseName: string;
    // statistics data
    updated: Date; // for data freshness comparison
    dataSize: number;
    totalVectors: number;
}

export interface GeneralDatabaseStatisticsInsert{
    // unique, identifies general statistics for a database
    databaseName: string;
    // statistics data
    updated: Date; // for data freshness comparison
    dataSize: number;
    totalVectors: number;
}

export const getGeneralDatabaseStatistics = async(databaseName: string): Promise<GeneralDatabaseStatisticsGet | undefined> => {

    try {
        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection(collectionName).findOne({ databaseName });

        if (!result) {
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
        console.log("Error getting general database statistics: ", error);
        throw new Error("Error getting general database statistics");
    }
};

export const addGeneralDatabaseStatistics = async(statistics: GeneralDatabaseStatisticsInsert): Promise<void> => {
    const ownerId = (await getDatabase(statistics.databaseName))?.ownerId;
    if (!ownerId) {
        throw new Error("Database not found");
    }
    const getStatisticsResult = await getGeneralDatabaseStatistics(statistics.databaseName);

    try {
        const client = await clientPromise;
        const db = client.db();

        if (!getStatisticsResult) {
            // general statistics don't exist for this database, create new statistics
            await db.collection(collectionName).insertOne(statistics);

            return;
        }
        // general statistics exist for this database
        if (statistics.updated.getTime() > getStatisticsResult.updated.getTime()) {
            // update if the latest write event is newer
            await db.collection(collectionName).updateOne({ databaseName: statistics.databaseName }, { $set: statistics });

            return;
        }
        // don't update otherwise

    } catch (error) {
        console.log("Error adding general database statistics: ", error);
        throw new Error("Error adding general database statistics");
    }
};

export const removeGeneralDatabaseStatistics = async(databaseName: string): Promise<void> => {
    try {
        const client = await clientPromise;
        const db = client.db();

        await db.collection(collectionName).deleteOne({ databaseName });

    } catch (error) {
        console.log("Error removing general database statistics: ", error);
        throw new Error("Error removing general database statistics");
    }
};