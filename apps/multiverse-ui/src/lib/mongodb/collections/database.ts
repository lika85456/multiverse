import clientPromise from "@/lib/mongodb/mongodb";
import type { ObjectId } from "mongodb";
import {
    addDatabaseToUser, removeAllDatabaseFromUser, removeDatabaseFromUser
} from "@/lib/mongodb/collections/user";
import { removeAllDailyStatisticsForDatabase } from "@/lib/mongodb/collections/daily-statistics";
import {
    addGeneralDatabaseStatistics,
    removeGeneralDatabaseStatistics
} from "@/lib/mongodb/collections/general-database-statistics";

export interface SecretToken {
    name: string;
    secret: string;
    validUntil: number;
}

export interface DatabaseGet {
  codeName: string;
  name: string;
  region: string;
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

// export const listDatabases = async(user: ObjectId): Promise<DatabaseFindMongoDb[]> => {
//     try {
//         const db = (await clientPromise).db();
//         const result = await db.collection("databases").find({ ownerId: user }).toArray();
//         if (!result) {
//             return [];
//         }
//
//         return result.map((database) => ({
//             _id: database._id,
//             name: database.name,
//             codeName: database.codeName,
//             records: database.records,
//             ownerId: database.ownerId,
//         }));
//     } catch (error) {
//         return [];
//     }
// };

export const getDatabase = async(codeName: string): Promise<DatabaseFindMongoDb | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("databases").findOne({ codeName });
        if (!result) {
            return undefined;
        }

        return {
            _id: result._id,
            name: result.name,
            codeName: result.codeName,
            records: result.records,
            ownerId: result.ownerId,
        };
    } catch (error) {
        return undefined;
    }
};

export const createDatabase = async(databaseData: DatabaseInsertMongoDb): Promise<ObjectId | undefined> => {
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
            const resultUser = await addDatabaseToUser(databaseData.ownerId, database.codeName);
            if (!resultUser.acknowledged) {
                throw new Error("Database not added to user");
            }
            await addGeneralDatabaseStatistics({
                databaseName: database.codeName,
                updated: new Date(),
                dataSize: 0,
                totalVectors: 0,
            });

            return resultDatabase.insertedId;
        });
    } catch (error) {
        await session.abortTransaction();

        return undefined;
    } finally {
        await session.endSession();
    }
};

export const deleteDatabase = async(codeName: string): Promise<boolean> => {
    const client = await clientPromise;
    const session = client.startSession();
    const db = (await clientPromise).db();
    try {
        return await session.withTransaction(async() => {
            const database = await db.collection("databases").findOne({ codeName });
            if (!database) {
                throw new Error("Database not found");
            }
            //remove existing database
            const result = await db.collection("databases").deleteOne({ codeName });
            if (!result.acknowledged) {
                throw new Error("Database not deleted");
            }
            //remove database from user's list of databases
            await removeDatabaseFromUser(database?.ownerId, database.codeName);
            //remove all statistics for the database
            await removeAllDailyStatisticsForDatabase(database.codeName);
            await removeGeneralDatabaseStatistics(database.codeName);

            return result.acknowledged;
        });
    } catch (error) {
        await session.abortTransaction();

        return false;
    } finally {
        await session.endSession();
    }
};

export const deleteAllDatabases = async(ownerId: ObjectId) => {
    const client = await clientPromise;
    const session = client.startSession();
    const db = client.db();

    try {
        return await session.withTransaction(async() => {
            const ownerResult = await db.collection("databases").findOne({ ownerId });
            if (!ownerResult) {
                throw new Error("Owner not found");
            }
            const databases: string[] = ownerResult.databases;
            await Promise.all(databases.map(async(database) => {
                await removeAllDailyStatisticsForDatabase(database);
                await removeGeneralDatabaseStatistics(database);
            }));

            const result = await db.collection("databases").deleteMany({ ownerId });
            if (!result.acknowledged) {
                throw new Error("Databases not deleted");
            }
            const resultUser = removeAllDatabaseFromUser(ownerId);
            if (!resultUser) {
                throw new Error("Databases not removed from user");
            }

            return true;
        });
    } catch (error) {
        await session.abortTransaction();

        return false;
    } finally {
        await session.endSession();
    }
};