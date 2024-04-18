import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { getGeneralDatabaseStatistics, } from "@/lib/mongodb/collections/general-database-statistics";
import type { DailyStatisticsGet } from "@/lib/mongodb/collections/daily-statistics";
import { convertToISODate } from "@/lib/mongodb/collections/daily-statistics";
import { getDailyStatisticsInterval } from "@/lib/mongodb/collections/daily-statistics";
import { TRPCError } from "@trpc/server";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { eachDayOfInterval, isAfter } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";
import { handleError } from "@/server";

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
export interface StatisticsData {
    date: string;
    value: number;
}

export interface GraphData {
    reads: StatisticsData[];
    writes: StatisticsData[];
    costs: StatisticsData[];
    responseTime: StatisticsData[];
}

export interface DailyStatisticsData {
    date: string;
    reads: number;
    writes: number;
    costs: number;
    totalResponseTime: number;
    averageResponseTime: number;
}

const emptyDailyStatistics = {
    date: "REPLACE_ME", // replace with actual date, CANNOT USE LIKE THIS
    reads: 0,
    writes: 0,
    costs: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
};

const dateIntervalISO = (from: string | UTCDate, to: string | UTCDate): { fromISO: string, toISO: string } => {
    //TODO replace with UTCDate
    return {
        fromISO: convertToISODate(from),
        toISO: convertToISODate(to),
    };
};

/**
 * Gets price for a specific database in a given period of time from AWS API.
 * @param databaseName
 * @param from
 * @param to
 */
const getPrice = (databaseName: string, from: string, to: string): number => {
    const { fromISO, toISO } = dateIntervalISO(from, to);
    log.debug("Getting price for database", databaseName, "from", fromISO, "to", toISO);

    //TODO - get price for database and queue for the given period
    return 0;
};

/**
 * Extract reads and writes from daily statistics
 * @param dailyStatistics
 */
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

/**
 * Calculate general statistics for a specific database in a given period of time
 * @param databaseName
 * @param from
 * @param to
 */
const calculateGeneralStatistics = async(databaseName: string, from: string, to: string): Promise<GeneralStatisticsData> => {
    const { fromISO, toISO } = dateIntervalISO(from, to);
    // get general statistics for a specific database
    const generalDatabaseStatistics = await getGeneralDatabaseStatistics(databaseName);
    if (!generalDatabaseStatistics) {
        // general database statistics do not exist, return empty general statistics
        return emptyGeneralStatistics;
    }

    // extract reads and writes from daily statistics
    const dailyStatistics = await getDailyStatisticsInterval(databaseName, fromISO, toISO);
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

/**
 * Merges two daily statistics data into one.
 * Dates must be the same, otherwise an error will be thrown.
 * @param data1
 * @param data2
 */
const mergeDailyStatisticsData = (data1: DailyStatisticsData, data2: DailyStatisticsData): DailyStatisticsData => {
    if (data1.date !== data2.date) {
        log.error("Dates must be the same", data1.date, data2.date);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Dates must be the same",
        });
    }

    const reads = data1.reads + data2.reads;
    const writes = data1.writes + data2.writes;
    const costs = data1.costs + data2.costs;
    const totalResponseTime = data1.totalResponseTime + data2.totalResponseTime;

    return {
        date: data1.date,
        reads,
        writes,
        costs,
        totalResponseTime,
        averageResponseTime: totalResponseTime / (reads)
    };
};

/**
 * Constructs an empty interval of daily statistics data in a form of map.
 * @param from
 * @param to
 */
const constructInterval = (from: string, to: string): Map<string, DailyStatisticsData> => {
    const { fromISO, toISO } = dateIntervalISO(from, to);

    if (isAfter(new UTCDate(fromISO), new UTCDate(toISO))) {
        log.error("Invalid date range", fromISO, toISO);
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid date range",
        });
    }

    const dates: UTCDate[] = eachDayOfInterval<UTCDate>({
        start: fromISO,
        end: toISO
    }, { step: 1 });

    const emptyInterval = new Map<string, DailyStatisticsData>();
    dates.forEach((date) => {
        emptyInterval.set(convertToISODate(date), {
            ...emptyDailyStatistics,
            date: convertToISODate(date),
        });
    });

    return emptyInterval;
};

/**
 * Calculate daily statistics for a specific database.
 * @param databaseName
 * @param from
 * @param to
 */
const calculateDailyStatistics = async(databaseName: string, from: string, to: string): Promise<DailyStatisticsData[]> => {
    const { fromISO, toISO } = dateIntervalISO(from, to);

    log.debug("Calculating daily statistics for the database", databaseName, "from", fromISO, "to", toISO);
    const dailyStatistics = await getDailyStatisticsInterval(databaseName, fromISO, toISO);

    // construct interval containing every day in the given period (from - to)
    const interval = constructInterval(fromISO, toISO);

    // replace empty daily statistics with actual daily statistics, others will be empty
    dailyStatistics.forEach((stat) => {
        interval.set(stat.date, {
            date: stat.date,
            reads: stat.readCount,
            writes: stat.writeCount,
            costs: stat.totalCost,
            totalResponseTime: stat.totalResponseTime,
            averageResponseTime: stat.totalResponseTime / (stat.readCount),
        });
    });

    return Array.from(interval.values());
};

/**
 * Extracts statistics from daily statistics data.
 * Statistics are extracted in a form usable for the frontend.
 * @param data
 */
export const extractStatistics = (data: DailyStatisticsData[]): GraphData => {
    return {
        costs: data.map((stat) => {
            return {
                value: stat.costs,
                date: stat.date
            };
        }),
        reads: data.map((stat) => {
            return {
                value: stat.reads,
                date: stat.date
            };
        }),
        writes: data.map((stat) => {
            return {
                value: stat.writes,
                date: stat.date
            };
        }),
        responseTime: data.map((stat) => {
            return {
                value: stat.averageResponseTime,
                date: stat.date
            };
        })
    };
};

export const statistics = router({
    /**
     * Router for general statistics.
     */
    general: router({
        /**
         * Get general statistics for a specific period of time.
         * If database is not defined, general statistics merged from all databases are returned.
         * If no databases are defined, empty general statistics are returned.
         */
        get: publicProcedure.input(z.object({
            database: z.optional(z.string().min(3)),
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
        })).query(async(opts): Promise<GeneralStatisticsData> => {
            try {
                const { fromISO, toISO } = dateIntervalISO(opts.input.from, opts.input.to);

                const sessionUser = await getSessionUser();
                if (!sessionUser) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Cannot get general statistics, user is not authenticated",
                    });
                }
                log.info("Calculating general statistics for the user", sessionUser.email, "from", fromISO, "to", toISO);

                if (opts.input.database) {
                    // calculate general statistics for a specific database
                    if (!sessionUser.databases.includes(opts.input.database)) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "User does not have access to the database",
                        });
                    }
                    log.info("Returning general statistics for the database", opts.input.database, "from", fromISO, "to", toISO);

                    return await calculateGeneralStatistics(opts.input.database, fromISO, toISO);
                }

                // check if user has databases defined
                if (!sessionUser.databases) {
                    log.info(`User ${sessionUser.email} does not have any databases, returning empty general statistics`);

                    return emptyGeneralStatistics;
                }

                // calculate general statistics for all databases
                const generalStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                    return await calculateGeneralStatistics(database, fromISO, toISO);
                }));
                log.info("Returning general statistics for all databases from", fromISO, "to", toISO, "for user", sessionUser.email);

                // sum general statistics for all databases
                const result = generalStatistics.reduce((acc, curr) => {
                    return {
                        costs: {
                            value: acc.costs.value + curr.costs.value,
                            currency: "$" as const,
                        },
                        totalVectors: {
                            count: acc.totalVectors.count + curr.totalVectors.count,
                            bytes: acc.totalVectors.bytes + curr.totalVectors.bytes,
                        },
                        reads: acc.reads + curr.reads,
                        writes: acc.writes + curr.writes,
                    };
                }, emptyGeneralStatistics);
                log.debug(`Result ${sessionUser.email} general statistics, queries ${result.reads}, writes ${result.writes}, costs ${result.costs.value}, vectors ${result.totalVectors.count}, bytes ${result.totalVectors.bytes}`);

                return result;
            } catch (error) {
                throw handleError({
                    error,
                    errorMessage: "Error calculating general statistics"
                });
            }
        }),
    }),
    /**
     * Router for daily statistics.
     */
    daily: router({
        /**
         * Get daily statistics for a specific period of time.
         * If database is not defined, daily statistics merged from all databases are returned.
         * If no databases are defined, empty daily statistics are returned.
         */
        get: publicProcedure.input(z.object({
            database: z.optional(z.string().min(3)),
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
        })).query(async(opts): Promise<GraphData> => {
            try {
                const { fromISO, toISO } = dateIntervalISO(opts.input.from, opts.input.to);

                const sessionUser = await getSessionUser();
                if (!sessionUser) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "User is not authenticated",
                    });
                }
                if (fromISO > toISO) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Invalid date range"
                    });
                }

                // calculate daily statistics for a specific database if defined
                if (opts.input.database) {
                    if (!sessionUser.databases.includes(opts.input.database)) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "User does not have access to the database",
                        });
                    }

                    log.info("Calculating daily statistics for the database", opts.input.database, "from", fromISO, "to", toISO);

                    // calculate daily statistics for a specific database
                    return extractStatistics(await calculateDailyStatistics(opts.input.database, fromISO, toISO));
                }

                // calculate daily statistics for all databases sessionUser owns otherwise
                const dailyDatabaseStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                    return await calculateDailyStatistics(database, fromISO, toISO);
                }));

                // if no daily statistics found, return empty statistics
                if (dailyDatabaseStatistics.length === 0) {
                    log.info(`No daily statistics found for user ${sessionUser.email} from ${fromISO} to ${toISO}`);

                    return extractStatistics(Array.from(constructInterval(fromISO, toISO).values()));
                }

                // merge daily statistics from all databases to get the final statistics
                const finalStatistics: DailyStatisticsData[] = dailyDatabaseStatistics[0];
                for (let i = 1; i < dailyDatabaseStatistics.length; i++) {
                    finalStatistics.forEach((stat, index) => {
                        finalStatistics[index] = mergeDailyStatisticsData(stat, dailyDatabaseStatistics[i][index]);
                    });
                }
                log.info("Returning daily statistics for all databases from", fromISO, "to", toISO, "for user", sessionUser.email);

                return extractStatistics(finalStatistics);
            } catch (error) {
                throw handleError({
                    error,
                    errorMessage: "Error calculating daily statistics"
                });
            }
        }),
    }),
});