import { ObjectId } from "mongodb";

export interface DailyStatisticsGet {
    _id: ObjectId;
    // unique identifies statistics for a database and day
    date: Date; // round to a date
    databaseName: string;
    // statistics data
    writeCount: number;
    readCount: number;
    totalResponseTime: number;
    totalCost: number;
}

export interface DailyStatisticsInsert {
    // unique identifies statistics for a database and day
    date: Date; // round to a date
    databaseName: string;
    // statistics data, to add to the existing data if exists
    addWriteCount: number;
    addReadCount: number;
    addTotalResponseTime: number;
    // statistics data, to set to the value
    totalCost: number;
}

export const getDailyStatistics = async(date: Date[], databaseName: string): Promise<DailyStatisticsGet> => {

    return {
        _id: new ObjectId(),
        date: new Date(),
        databaseName: "",
        writeCount: 0,
        readCount: 0,
        totalResponseTime: 0,
        totalCost: 0
    };
};

export const addDailyStatistics = async(statistics: DailyStatisticsInsert): Promise<DailyStatisticsGet> => {

    return {
        _id: new ObjectId(),
        date: new Date(),
        databaseName: "",
        writeCount: 0,
        readCount: 0,
        totalResponseTime: 0,
        totalCost: 0
    };
};