import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { getGeneralDatabaseStatistics, } from "@/lib/mongodb/collections/general-database-statistics";
import type { DailyStatisticsGet } from "@/lib/mongodb/collections/daily-statistics";
import { convertToISODate } from "@/lib/mongodb/collections/daily-statistics";
import { getDailyStatisticsInterval } from "@/lib/mongodb/collections/daily-statistics";
import { TRPCError } from "@trpc/server";
import { getSessionUser } from "@/lib/mongodb/collections/user";

export interface GeneralStatisticsData {
    costs: {
        value: number;
        currency: "$";
    };
    totalVectors: {
        count: number;
        bytes: number;
    };
    reads: number;
    writes: number;
}

export interface StatisticsData {
    date: string;
    value: number;
}
export interface DailyStatisticsData {
    costs: {
        unit: "$";
        data: StatisticsData[];
    }
    reads: StatisticsData[];
    writes: StatisticsData[];
    responseTime: StatisticsData[];
}

const emptyGeneralStatistics = {
    costs: {
        value: 0,
        currency: "$" as const,
    },
    totalVectors: {
        count: 0,
        bytes: 0,
    },
    reads: 0,
    writes: 0,
};

const emptyDailyStatistics: DailyStatisticsData = {
    costs: {
        unit: "$",
        data: [],
    },
    reads: [],
    writes: [],
    responseTime: [],
};

const fromToIso = (from: string | Date, to: string | Date): { fromISO: string, toISO: string } => {
    return {
        fromISO: convertToISODate(from),
        toISO: convertToISODate(to),
    };
};

const mergeData = (data1: StatisticsData[], data2: StatisticsData[]): StatisticsData[] => {
    if (data1.length === 0 || data2.length === 0) {
        return [];
    }
    if (data1.length !== data2.length) {
        throw new Error("Data arrays must have the same length");
    }

    return data1.map((data, index) => {
        if (data.date !== data2[index].date) {
            throw new Error("Data arrays must have the same dates");
        }

        return {
            date: convertToISODate(data.date),
            value: data.value + data2[index].value,
        };
    });
};

const mergeDailyStatisticsData = (data1: DailyStatisticsData, data2: DailyStatisticsData): DailyStatisticsData => {
    return {
        costs: {
            unit: "$",
            data: mergeData(data1.costs.data, data2.costs.data),
        },
        reads: mergeData(data1.reads, data2.reads),
        writes: mergeData(data1.writes, data2.writes),
        responseTime: mergeData(data1.responseTime, data2.responseTime),
    };
};

const getPrice = (databaseName: string, from: string, to: string): number => {
    const { fromISO, toISO } = fromToIso(from, to);

    //TODO - get price for database and queue for the given period
    return 0;
};

const extractReadsWrites = (dailyStatistics: DailyStatisticsGet[]): { reads: number, writes: number } => {
    return dailyStatistics.reduce((acc, curr) => {
        return {
            reads: acc.reads + curr.readCount,
            writes: acc.writes + curr.writeCount
        };
    }, {
        reads: 0,
        writes: 0
    });
};

const calculateGeneralStatistics = async(databaseName: string, from: string, to: string): Promise<GeneralStatisticsData> => {
    const { fromISO, toISO } = fromToIso(from, to);
    // get general statistics for a specific database
    const generalDatabaseStatistics = await getGeneralDatabaseStatistics(databaseName);
    if (!generalDatabaseStatistics) {
        // general database statistics do not exist, return empty general statistics
        return emptyGeneralStatistics;
    }

    // extract reads and writes from daily statistics
    const dailyStatistics = await getDailyStatisticsInterval(databaseName, from, to);
    const { reads, writes } = extractReadsWrites(dailyStatistics);

    // return existing general database statistics
    return {
        costs: {
            value: getPrice(databaseName, fromISO, toISO,),
            currency: "$" as const,
        },
        totalVectors: {
            count: generalDatabaseStatistics.totalVectors,
            bytes: generalDatabaseStatistics.dataSize,
        },
        reads: reads,
        writes: writes,
    };
};

const calculateDailyStatistics = async(databaseName: string, from: string, to: string): Promise<DailyStatisticsData> => {
    const { fromISO, toISO } = fromToIso(from, to);

    const dailyStatistics = await getDailyStatisticsInterval(databaseName, fromISO, toISO);
    if (dailyStatistics.length === 0) {
        console.log("No daily statistics found");

        return emptyDailyStatistics;
    }

    const extractedStatistics = {
        costs: {
            unit: "$" as const,
            data: dailyStatistics.map((stat) => {
                return {
                    date: convertToISODate(stat.date),
                    value: stat.totalCost,
                };
            }),
        },
        reads: dailyStatistics.map((stat) => {
            return {
                date: convertToISODate(stat.date),
                value: stat.readCount,
            };
        }),
        writes: dailyStatistics.map((stat) => {
            return {
                date: convertToISODate(stat.date),
                value: stat.writeCount,
            };
        }),
        responseTime: dailyStatistics.map((stat) => {
            return {
                date: convertToISODate(stat.date),
                value: stat.totalResponseTime / stat.readCount,
            };
        }),
    };

    return extractedStatistics;
};

export const statistics = router({
    general: router({
        get: publicProcedure.input(z.object({
            database: z.optional(z.string().min(3)),
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
        })).query(async(opts): Promise<GeneralStatisticsData> => {
            const { fromISO, toISO } = fromToIso(opts.input.from, opts.input.to);

            const sessionUser = await getSessionUser();
            if (!sessionUser) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "User not found",
                });
            }

            if (opts.input.database) {
                // calculate general statistics for a specific database
                if (!sessionUser.databases.includes(opts.input.database)) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "User does not have access to the database",
                    });
                }

                return await calculateGeneralStatistics(opts.input.database, fromISO, toISO);
            }

            // calculate general statistics for all databases
            const generalStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                return await calculateGeneralStatistics(database, fromISO, toISO);
            }));

            // sum general statistics for all databases
            const x = generalStatistics.reduce((acc, curr) => {
                acc.costs.value += curr.costs.value;
                acc.totalVectors.count += curr.totalVectors.count;
                acc.totalVectors.bytes += curr.totalVectors.bytes;
                acc.reads += curr.reads;
                acc.writes += curr.writes;

                return acc;
            }, emptyGeneralStatistics);

            console.log(JSON.stringify(x, null, 2));

            return x;
        }),
    }),
    daily: router({
        get: publicProcedure.input(z.object({
            database: z.optional(z.string().min(3)),
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
        })).query(async(opts): Promise<DailyStatisticsData> => {
            const { fromISO, toISO } = fromToIso(opts.input.from, opts.input.to);

            const sessionUser = await getSessionUser();
            if (!sessionUser) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "User not found",
                });
            }

            if (fromISO > toISO) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid date range",
                });
            }

            if (opts.input.database) {
                // calculate daily statistics for a specific database
                return await calculateDailyStatistics(opts.input.database, fromISO, toISO);
            }

            // calculate daily statistics for all databases
            const dailyDatabaseStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                return await calculateDailyStatistics(database, fromISO, toISO);
            }));

            // sum daily statistics for all databases
            const mergedDailyStatistics = dailyDatabaseStatistics.reduce((acc, curr) => {
                return mergeDailyStatisticsData(acc, curr);
            }, emptyDailyStatistics);

            console.log(JSON.stringify(mergedDailyStatistics, null, 2));

            return mergedDailyStatistics;

        }),
    }),
});