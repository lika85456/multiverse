import { publicProcedure, router } from "@/server/trpc";

export const statistics = router({
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