import { publicProcedure, router } from "@/server/trpc";
import {
    costsStatistics, requestsStatistics, responseTimeStatistics, writeCountStatistics
} from "@/server/dummy-data";
import z from "zod";
import { getGeneralDatabaseStatistics, } from "@/lib/mongodb/collections/general-database-statistics";
import type { DailyStatisticsGet } from "@/lib/mongodb/collections/daily-statistics";
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

const getPrice = (databaseName: string, from: Date, to: Date): number => {
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

const calculateGeneralStatistics = async(databaseName: string, from: Date, to: Date): Promise<GeneralStatisticsData> => {
    // get general statistics for a specific database
    const generalDatabaseStatistics = await getGeneralDatabaseStatistics(databaseName);
    if (!generalDatabaseStatistics) {
        // general database statistics do not exist, return empty general statistics
        return emptyGeneralStatistics;
    }

    // extract reads and writes from daily statistics
    const dailyStatistics = await getDailyStatisticsInterval(databaseName, from.toDateString(), to.toDateString());
    const { reads, writes } = extractReadsWrites(dailyStatistics);

    // return existing general database statistics
    return {
        costs: {
            value: getPrice(databaseName, new Date(from), new Date(to),),
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

export const statistics = router({
    general: router({
        get: publicProcedure.input(z.object({
            database: z.optional(z.string().min(3)),
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }),
        })).query(async(opts): Promise<GeneralStatisticsData> => {
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

                return await calculateGeneralStatistics(opts.input.database, new Date(opts.input.from), new Date(opts.input.to));
            }

            // calculate general statistics for all databases
            const generalStatistics = await Promise.all(sessionUser.databases.map(async(database) => {
                return await calculateGeneralStatistics(database, new Date(opts.input.from), new Date(opts.input.to));
            }));

            // sum general statistics for all databases
            return generalStatistics.reduce((acc, curr) => {
                acc.costs.value += curr.costs.value;
                acc.totalVectors.count += curr.totalVectors.count;
                acc.totalVectors.bytes += curr.totalVectors.bytes;
                acc.reads += curr.reads;
                acc.writes += curr.writes;

                return acc;
            }, emptyGeneralStatistics);
        }),
    }),
    graphStatistics: router({
        get: publicProcedure.input(z.object({
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }), // { "from": "2021-08-01" }
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }), // { "from": "2021-08-01" },
        })).query(async(opts) => {
            console.log(opts.input.from);
            console.log(opts.input.to);

            return {
                costs: costsStatistics,
                requests: requestsStatistics,
                responseTime: responseTimeStatistics,
                writeCount: writeCountStatistics
            };
        }),
    }),

    costs: router({
        get: publicProcedure.input(z.object({
            from: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }), // { "from": "2021-08-01" }
            to: z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", }), // { "from": "2021-08-01" },
        })).query(async() => {
            return costsStatistics;
        }),
    }),
    requests: router({
        get: publicProcedure.query(async() => {
            return {};
        }),
    }),
    responseTime: router({
        get: publicProcedure.query(async() => {
            return {};
        }),
    }),
    writeCount: router({
        get: publicProcedure.query(async() => {
            return {};
        }),
    }),
});