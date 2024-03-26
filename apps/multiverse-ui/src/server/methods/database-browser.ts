import { publicProcedure } from "@/server/trpc";

export const databaseBrowserMethods = {
    runVectorQuery: publicProcedure.query(async() => {
        return [];
    }),
};