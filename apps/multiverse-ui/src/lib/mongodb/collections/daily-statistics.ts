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

export const convertToISODate = (date: Date | string): string => {
    if (typeof date === "string") {
        return new Date(date).toISOString().split("T")[0];
    }

    return date.toISOString().split("T")[0];
};

export const getDailyStatistics = async(dates: string[], databaseName: string): Promise<DailyStatisticsGet[]> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        const result = await db.collection(collectionName).find({
            date: dates.map((date) => convertToISODate(date)),
            databaseName
        }).toArray();

        return result.map((stat) => {
            return {
                _id: stat._id,
                date: convertToISODate(stat.date),
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
    dateFrom: string,
    dateTo: string,
): Promise<DailyStatisticsGet[]> => {
    try {
        const client = await clientPromise;
        const db = client.db();
        console.log("a");
        const result = await db.collection(collectionName).find({
            date: {
                $gte: convertToISODate(dateFrom),
                $lte: convertToISODate(dateTo)
            },
            databaseName
        }).toArray();
        console.log("b");

        return result.map((stat) => {
            console.log("c");

            return {
                _id: stat._id,
                date: convertToISODate(stat.date),
                databaseName: stat.databaseName,
                writeCount: stat.writeCount,
                readCount: stat.readCount,
                totalResponseTime: stat.totalResponseTime,
                totalCost: stat.totalCost
            };
        });
    } catch (error) {
        console.log("Error getting daily statistics: ", error);
        throw new Error("Error getting daily statistics");
    }

};

export const addDailyStatistics = async(statistics: DailyStatisticsAdd): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        const result = await db.collection(collectionName).findOne({
            date: convertToISODate(statistics.date),
            databaseName: statistics.databaseName
        });

        const statisticsData: DailyStatisticsAdd = result ? {
            ...statistics,
            date: convertToISODate(statistics.date),
            writeCount: statistics.writeCount + result.writeCount,
            readCount: statistics.readCount + result.readCount,
            totalResponseTime: statistics.totalResponseTime + result.totalResponseTime,
        } : {
            ...statistics,
            date: convertToISODate(statistics.date)
        };

        await db.collection(collectionName).updateOne({
            date: convertToISODate(statistics.date),
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

export const removeAllDailyStatisticsForDatabase = async(databaseName: string): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        await db.collection(collectionName).deleteMany({ databaseName });
    } catch (error) {
        throw new Error("Error removing daily statistics");
    }
};