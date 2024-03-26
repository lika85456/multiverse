import { publicProcedure } from "@/app/server/trpc";

export const statisticsMethods = {
    getGeneralStatistics: publicProcedure.query(async() => {
        return {};
    }),
    getGeneralPricingStatistics: publicProcedure.query(async() => {
        return {};
    }),
    getCostsStatistics: publicProcedure.query(async() => {
        return {};
    }),
    getRequestsStatistics: publicProcedure.query(async() => {
        return {};
    }),
    getResponseTimeStatistics: publicProcedure.query(async() => {
        return {};
    }),
    getWriteCountStatistics: publicProcedure.query(async() => {
        return {};
    }),
};