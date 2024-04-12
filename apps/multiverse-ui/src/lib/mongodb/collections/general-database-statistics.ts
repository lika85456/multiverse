import { ObjectId } from "mongodb";

export interface GeneralDatabaseStatisticsGet{
    _id: ObjectId;
    // unique, identifies general statistics for a database
    databaseName: string;
    // statistics data
    timestamp: Date; // for data freshness comparison
    dataSize: number;
    totalRecords: number;
    ownerId: ObjectId;
}

export interface GeneralDatabaseStatisticsInsert{
    _id: ObjectId;
    // unique, identifies general statistics for a database
    databaseName: string;
    // statistics data
    timestamp: Date; // for data freshness comparison
    dataSize?: number;
    totalRecords?: number;
    ownerId: ObjectId;
}

export const getGeneralDatabaseStatistics = async(databaseName: string): Promise<GeneralDatabaseStatisticsGet> => {
    return {
        _id: new ObjectId(),
        databaseName: "",
        timestamp: new Date(),
        dataSize: 0,
        totalRecords: 0,
        ownerId: new ObjectId()
    };
};

export const addGeneralDatabaseStatistics = async(statistics: GeneralDatabaseStatisticsInsert): Promise<GeneralDatabaseStatisticsGet> => {
    return {
        _id: new ObjectId(),
        databaseName: "",
        timestamp: new Date(),
        dataSize: 0,
        totalRecords: 0,
        ownerId: new ObjectId()
    };
};