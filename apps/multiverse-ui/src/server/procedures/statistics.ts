import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { getGeneralDatabaseStatistics, } from "@/lib/mongodb/collections/general-database-statistics";
import type { DailyStatisticsFind } from "@/lib/mongodb/collections/daily-statistics";
import { convertToISODate, getDailyStatisticsInterval } from "@/lib/mongodb/collections/daily-statistics";
import { TRPCError } from "@trpc/server";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { eachDayOfInterval, isAfter } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";
import { handleError } from "@/server";
import type { Cost } from "@/lib/statistics-processor/CostsProcessor";
import { CostsProcessor } from "@/lib/statistics-processor/CostsProcessor";
import type { ObjectId } from "mongodb";

export interface GeneralStatisticsData {
    costs: {
        value: number;
        enabled: boolean;
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
        enabled: false,
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
    costsEnabled?: boolean;
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
    return {
        fromISO: convertToISODate(from),
        toISO: convertToISODate(to),
    };
};

/**
 * Extract reads and writes from daily statistics
 * @param dailyStatistics
 */
const extractReadsWrites = (dailyStatistics: DailyStatisticsFind[]): { reads: number, writes: number } => {
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
 * @param userId
 */
const calculateGeneralStatistics = async({
    from, to, databaseName
}: {
    from: string,
    to: string,
    databaseName: string,
},): Promise<GeneralStatisticsData> => {
    const { fromISO, toISO } = dateIntervalISO(from, to);

    // get general statistics for a specific database
    const generalDatabaseStatistics = await getGeneralDatabaseStatistics(databaseName);
    if (!generalDatabaseStatistics) {
        // general database statistics do not exist, return empty general statistics
        return {
            ...emptyGeneralStatistics,
            costs: {
                value: 0,
                currency: "$" as const,
                enabled: false,
            },
        };
    }

    // extract reads and writes from daily statistics
    const dailyStatistics = await getDailyStatisticsInterval(databaseName, fromISO, toISO);
    const { reads, writes } = extractReadsWrites(dailyStatistics);

    // return existing general database statistics with empty costs
    return {
        costs: {
            value: 0,
            currency: "$" as const,
            enabled: false,
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
        averageResponseTime: reads === 0 ? 0 : totalResponseTime / (reads)
    };
};

/**
 * Constructs an empty interval of daily statistics data in a form of map.
 * @param from
 * @param to
 */
const constructInterval = (from: string, to: string): Map<string, DailyStatisticsData> => {
    if (isAfter(new UTCDate(from), new UTCDate(to))) {
        log.error("Invalid date range", from, to);
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid date range",
        });
    }
    const dates: UTCDate[] = eachDayOfInterval<UTCDate>({
        start: new UTCDate(from),
        end: new UTCDate(to),
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
 * Calculate costs for a specific period of time.
 * Costs are returned in a form of interval containing a date and cost for that date.
 * @param from - start date
 * @param to - end date
 * @param userId - user id, required to obtain credentials
 * @param databaseCodeName - database code name, optional (if not provided, costs for all multiverse services are calculated)
 */
const calculateCosts = async(from: UTCDate, to: UTCDate, userId: ObjectId, databaseCodeName?: string): Promise<Cost[]> => {
    const costsProcessor = new CostsProcessor();

    return await costsProcessor.getCosts(from, to, userId, databaseCodeName);
};

/**
 * Calculate costs for a specific period of time.
 * Costs in the period are merged into single value.
 * @param from - start date
 * @param to - end date
 * @param userId - user id, required to obtain credentials
 * @param databaseCodeName - database code name, optional (if not provided, costs for all multiverse services are calculated)
 */
const calculateCostsMerged = async(from: UTCDate, to: UTCDate, userId: ObjectId, databaseCodeName?: string): Promise<number> => {
    const costsProcessor = new CostsProcessor();
    const costs = await costsProcessor.getCosts(from, to, userId, databaseCodeName);

    return costs.reduce((acc, curr) => {
        return acc + curr.cost;
    }, 0);
};

/**
 * Adds costs to daily statistics data.
 * Costs are added to the daily statistics data based on the date.
 * @param dailyStatistics - daily statistics data
 * @param costs - costs data
 */
const addCostsToDailyStatistics = (dailyStatistics: DailyStatisticsData[], costs: Cost[]): DailyStatisticsData[] => {
    const costsMap = costs.reduce((acc, curr) => {
        acc.set(convertToISODate(curr.date), curr.cost);

        return acc;
    }, new Map<string, number>);
    dailyStatistics.forEach((stat) => {
        stat.costs = costsMap.get(stat.date) ?? 0;
    });

    return dailyStatistics;
};

/**
 * Calculate daily statistics for a specific database.
 * @param databaseName
 * @param from
 * @param to
 */
const calculateDailyStatistics = async(databaseName: string, from: string, to: string): Promise<DailyStatisticsData[]> => {
    log.debug("Calculating daily statistics for the database", databaseName, "from", from, "to", to);
    const dailyStatistics = await getDailyStatisticsInterval(databaseName, from, to);

    // construct interval containing every day in the given period (from - to)
    const interval = constructInterval(from, to);

    // replace empty daily statistics with actual daily statistics, others will be empty
    dailyStatistics.forEach((stat) => {
        interval.set(stat.date, {
            date: stat.date,
            reads: stat.readCount,
            writes: stat.writeCount,
            costs: stat.totalCost,
            totalResponseTime: stat.totalResponseTime,
            averageResponseTime: stat.readCount === 0 ? 0 : stat.totalResponseTime / (stat.readCount),
        });
    });

    return Array.from(interval.values());
};

/**
 * Extracts statistics from daily statistics data.
 * Statistics are extracted in a form usable for the frontend.
 * @param data
 * @param costsEnabled
 */
export const extractStatistics = (data: DailyStatisticsData[], costsEnabled: boolean): GraphData => {
    return {
        costs: data.map((stat) => {
            return {
                value: stat.costs,
                date: stat.date
            };
        }),
        costsEnabled: costsEnabled,
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
                const fromUTC = new UTCDate(fromISO);
                const toUTC = new UTCDate(toISO);

                const sessionUser = await getSessionUser();
                if (!sessionUser) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Cannot get general statistics, user is not authenticated",
                    });
                }
                const costsEnabled = sessionUser.acceptedCostsGeneration ?? false;

                if (opts.input.database) {
                    // calculate general statistics for a specific database
                    if (!sessionUser.databases.includes(opts.input.database)) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "User does not have access to the database",
                        });
                    }
                    log.debug("Returning general statistics for the database", opts.input.database, "from", fromISO, "to", toISO);

                    // calculate general statistics for a specific database
                    const generalStatistics = await calculateGeneralStatistics({
                        from: fromISO,
                        to: toISO,
                        databaseName: opts.input.database,
                    });

                    // get costs from AWS API and add them to the general statistics
                    generalStatistics.costs.value = await calculateCostsMerged(fromUTC, toUTC, sessionUser._id, opts.input.database);
                    generalStatistics.costs.enabled = costsEnabled;

                    // return general statistics with costs
                    return generalStatistics;
                }

                // check if user has databases defined
                if (!sessionUser.databases) {
                    log.debug(`User ${sessionUser.email} does not have any databases, returning empty general statistics`);
                    const generalStatistics = emptyGeneralStatistics;
                    generalStatistics.costs.enabled = costsEnabled;

                    return generalStatistics;
                }

                // calculate general statistics for all databases
                const generalStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                    return await calculateGeneralStatistics({
                        from: fromISO,
                        to: toISO,
                        databaseName: database,
                    });
                }));
                log.debug("Returning general statistics for all databases from", fromISO, "to", toISO, "for user", sessionUser.email);

                // sum general statistics for all databases
                const summedGeneralStatistics = generalStatistics.reduce((acc, curr) => {
                    return {
                        costs: {
                            value: acc.costs.value + curr.costs.value,
                            currency: "$" as const,
                            enabled: false,
                        },
                        totalVectors: {
                            count: acc.totalVectors.count + curr.totalVectors.count,
                            bytes: acc.totalVectors.bytes + curr.totalVectors.bytes,
                        },
                        reads: acc.reads + curr.reads,
                        writes: acc.writes + curr.writes,
                    };
                }, emptyGeneralStatistics);

                // get costs from AWS API and add them to the general statistics
                summedGeneralStatistics.costs.value = await calculateCostsMerged(fromUTC, toUTC, sessionUser._id);
                summedGeneralStatistics.costs.enabled = costsEnabled;
                log.debug(`Result ${sessionUser.email} general statistics, queries ${summedGeneralStatistics.reads}, writes ${summedGeneralStatistics.writes}, costs ${summedGeneralStatistics.costs.value}, vectors ${summedGeneralStatistics.totalVectors.count}, bytes ${summedGeneralStatistics.totalVectors.bytes}`);

                return summedGeneralStatistics;
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
                const fromUTC = new UTCDate(fromISO);
                const toUTC = new UTCDate(toISO);

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

                    log.debug("Calculating daily statistics for the database", opts.input.database, "from", fromISO, "to", toISO);

                    // calculate daily statistics for a specific database
                    const dailyStatistics = await calculateDailyStatistics(opts.input.database, fromISO, toISO);
                    const dailyCosts = await calculateCosts(fromUTC, toUTC, sessionUser._id, opts.input.database);

                    return extractStatistics(addCostsToDailyStatistics(dailyStatistics, dailyCosts), sessionUser.acceptedCostsGeneration);
                }

                // calculate daily statistics for all databases sessionUser owns otherwise
                const dailyDatabaseStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                    return await calculateDailyStatistics(database, fromISO, toISO);
                }) ?? []);

                // if no daily statistics found, return empty statistics
                if (dailyDatabaseStatistics.length === 0) {
                    log.debug(`No daily statistics found for user ${sessionUser.email} from ${fromISO} to ${toISO}`);

                    return extractStatistics(Array.from(constructInterval(fromISO, toISO).values()), sessionUser.acceptedCostsGeneration);
                }

                // merge daily statistics from all databases to get the final statistics
                const mergedStatistics: DailyStatisticsData[] = dailyDatabaseStatistics[0];
                for (let i = 1; i < dailyDatabaseStatistics.length; i++) {
                    mergedStatistics.forEach((stat, index) => {
                        mergedStatistics[index] = mergeDailyStatisticsData(stat, dailyDatabaseStatistics[i][index]);
                    });
                }

                // calculate costs for all databases
                const dailyCosts = await calculateCosts(fromUTC, toUTC, sessionUser._id);
                log.debug("Returning daily statistics for all databases from", fromISO, "to", toISO, "for user", sessionUser.email);

                return extractStatistics(addCostsToDailyStatistics(mergedStatistics, dailyCosts), sessionUser.acceptedCostsGeneration);
            } catch (error) {
                throw handleError({
                    error,
                    errorMessage: "Error calculating daily statistics"
                });
            }
        }),
    })
});