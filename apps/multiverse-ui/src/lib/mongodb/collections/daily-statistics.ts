import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb/mongodb";

export const collectionName = "daily_statistics";

export interface DailyStatisticsGet {
    _id: ObjectId;
    // unique identifies statistics for a database and day
    date: string; // round to a date
    databaseName: string;
    // statistics data
    writeCount: number;
    readCount: number;
    totalResponseTime: number;
    totalCost: number;
}

export interface DailyStatisticsAdd {
    // unique identifies statistics for a database and day
    date: string; // round to a date
    databaseName: string;
    // statistics data, to add to the existing data if exists
    writeCount: number;
    readCount: number;
    totalResponseTime: number;
    // statistics data, to set to the value
    totalCost: number;
}

export const getDailyStatistics = async(date: string[], databaseName: string): Promise<DailyStatisticsGet[]> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        const result = await db.collection(collectionName).find({
            date,
            databaseName
        }).toArray();

        return result.map((stat) => {
            return {
                _id: stat._id,
                date: stat.date,
                databaseName: stat.databaseName,
                writeCount: stat.writeCount,
                readCount: stat.readCount,
                totalResponseTime: stat.totalResponseTime,
                totalCost: stat.totalCost
            };
        });
    } catch (error) {
        throw new Error("Error getting daily statistics");
    }
};

export const getDailyStatisticsInterval = async(
    databaseName: string,
    dateStart: string,
    dateEnd: string,
): Promise<DailyStatisticsGet[]> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        const result = await db.collection(collectionName).find({
            date: {
                $gte: dateStart,
                $lte: dateEnd
            },
            databaseName
        }).toArray();

        return result.map((stat) => {
            return {
                _id: stat._id,
                date: stat.date,
                databaseName: stat.databaseName,
                writeCount: stat.writeCount,
                readCount: stat.readCount,
                totalResponseTime: stat.totalResponseTime,
                totalCost: stat.totalCost
            };
        });
    } catch (error) {
        throw new Error("Error getting daily statistics");
    }

};

export const addDailyStatistics = async(statistics: DailyStatisticsAdd): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        const result = await db.collection(collectionName).findOne({
            date: statistics.date,
            databaseName: statistics.databaseName
        });

        const statisticsData: DailyStatisticsAdd = result ? {
            date: statistics.date,
            databaseName: statistics.databaseName,
            writeCount: statistics.writeCount + result.writeCount,
            readCount: statistics.readCount + result.readCount,
            totalResponseTime: statistics.totalResponseTime + result.totalResponseTime,
            totalCost: statistics.totalCost
        } : {
            date: statistics.date,
            databaseName: statistics.databaseName,
            writeCount: 0,
            readCount: 0,
            totalResponseTime: 0,
            totalCost: 0
        };

        await db.collection(collectionName).updateOne({
            date: statistics.date,
            databaseName: statistics.databaseName
        }, {
            $set: {
                writeCount: statisticsData.writeCount,
                readCount: statisticsData.readCount,
                totalResponseTime: statisticsData.totalResponseTime,
                totalCost: statisticsData.totalCost
            }
        }, { upsert: true });
    } catch (error) {
        console.log("Error adding daily statistics: ", error);
        throw new Error("Error adding daily statistics");
    }
};

export const removeAllStatisticsForDatabase = async(databaseName: string): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        await db.collection(collectionName).deleteMany({ databaseName });
    } catch (error) {
        throw new Error("Error removing daily statistics");
    }
};