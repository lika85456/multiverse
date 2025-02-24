import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb/mongodb";
import { UTCDate } from "@date-fns/utc";
import { formatISO } from "date-fns";
import log from "@multiverse/log";

export const collectionName = "daily_statistics";

export interface DailyStatisticsFind {
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

export interface DailyStatisticsInsert {
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

export const convertToISODate = (date: UTCDate | string): string => {
    return formatISO(new UTCDate(date), { representation: "date" });
};

/**
 * Get daily statistics for a database for a list of dates
 * @param dates - list of dates to get statistics for
 * @param databaseName - name of the database to get statistics for
 */
export const getDailyStatisticsForDates = async(dates: string[], databaseName: string): Promise<DailyStatisticsFind[]> => {
    const client = await clientPromise;
    const db = client.db();

    // log.debug(`Getting daily statistics for dates ${JSON.stringify(dates, null, 2)} for ${databaseName} `);
    try {
        const result = await db.collection<DailyStatisticsFind>(collectionName).find({
            date: dates.map((date) => convertToISODate(date)),
            databaseName
        }).toArray();
        log.debug(`Found ${result.length} daily statistics`);

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
        log.error(error);
        throw new Error("Error getting daily statistics");
    }
};

/**
 * Get daily statistics for a database for a date
 * @param databaseName - name of the database to get statistics for
 * @param dateFrom - start date
 * @param dateTo - end date
 */
export const getDailyStatisticsInterval = async(
    databaseName: string,
    dateFrom: string,
    dateTo: string,
): Promise<DailyStatisticsFind[]> => {
    try {
        const client = await clientPromise;
        const db = client.db();
        const result = await db.collection<DailyStatisticsFind>(collectionName).find({
            date: {
                $gte: convertToISODate(dateFrom),
                $lte: convertToISODate(dateTo)
            },
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
        log.error(error);
        throw new Error("Error getting daily statistics");
    }

};

/**
 * Add daily statistics for a database
 * If the statistics for the date already exists, the values are added to the existing values
 * If the statistics for the date does not exist, the values are set to the new values
 * @param statistics
 */
export const addDailyStatistics = async(statistics: DailyStatisticsInsert): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();

    try {
        const result = await db.collection<DailyStatisticsInsert>(collectionName).findOne({
            date: convertToISODate(statistics.date),
            databaseName: statistics.databaseName
        });

        const statisticsData: DailyStatisticsInsert = result ? {
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
        log.error(error);
        throw new Error("Error adding daily statistics");
    }
};

/**
 * Remove all daily statistics for a database
 * @param databaseName - name of the database to remove statistics for
 */
export const removeAllDailyStatisticsForDatabase = async(databaseName: string): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();

    log.info(`Removing all daily statistics for database ${databaseName}`);
    try {
        await db.collection<DailyStatisticsFind>(collectionName).deleteMany({ databaseName });
        log.info(`Removed all daily statistics for database ${databaseName}`);
    } catch (error) {
        log.error(error);
        throw new Error("Error removing daily statistics");
    }
};