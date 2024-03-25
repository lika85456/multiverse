import { publicProcedure } from "@/app/server/trpc";

export const databaseBrowserMethods = {
    runVectorQuery: publicProcedure.query(async() => {
        return [];
    }),
};