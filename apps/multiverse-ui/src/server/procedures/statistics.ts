import { publicProcedure, router } from "@/server/trpc";
import {
    costs, requests, responseTime, writeCount
} from "@/server/dummy-data";
import { DateRange } from "react-day-picker";
import z from "zod";

export const statistics = router({
    general: router({
        get: publicProcedure.query(async() => {
            return {
                totalCost: 12.47,
                dataSize: 2_300_000_000,
                totalRecords: 2_537_291,
                queries: 627_291,
            };

        }),
    }),
    generalPricing: router({
        get: publicProcedure.query(async() => {
            return {};
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
                costs: costs,
                requests: requests,
                responseTime: responseTime,
                writeCount: writeCount
            };
        }),
    }),

    costs: router({
        get: publicProcedure.query(async() => {
            return costs;
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

    get: router({
        general: publicProcedure.query(async() => {
            return {};
        }),
        generalPricing: publicProcedure.query(async() => {
            return {};
        }),
        costs: publicProcedure.query(async() => {
            return {};
        }),
        requests: publicProcedure.query(async() => {
            return {};
        }),
        responseTime: publicProcedure.query(async() => {
            return {};
        }),
        writeCount: publicProcedure.query(async() => {
            return {};
        }),
    })
});