import { publicProcedure, router } from "@/server/trpc";
import {
    costsStatistics,
    generalDatabaseStatistics,
    generalStatistics,
    requestsStatistics,
    responseTimeStatistics,
    writeCountStatistics
} from "@/server/dummy-data";
import z from "zod";
import format from "@/features/statistics/format";

export const statistics = router({
    general: router({
        get: publicProcedure.input(z.object({
            databaseCodeName: z.optional(z.string().min(3)),
            from: z.optional(z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", })),
            to: z.optional(z.string().refine((v) => new Date(v) instanceof Date, { message: "Invalid date", })),
        })).query(async(opts) => {
            if (!opts.input.databaseCodeName) {
                return generalStatistics;
            }

            return generalDatabaseStatistics;
        }),
    }),
    generalPricing: router({
        get: publicProcedure.query(async() => {
            return [
                {
                    label: "Total Cost",
                    value: `$ ${format(27.13, "delim")}`,
                },
                {
                    label: "Total Records",
                    value: `${format(7800000, "compact")} (${format(150000000000, "bytes")})`,
                },
                {
                    label: "Queries",
                    value: `${format(1200000, "compact")}`,
                },
                {
                    label: "Writes",
                    value: `${format(400000, "compact")}`,
                },
            ];
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