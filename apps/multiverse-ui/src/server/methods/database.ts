import { publicProcedure, router } from "@/server/trpc";
import { dummyData } from "@/server/dummy_data";
import z from "zod";

export const databaseMethods = {
    getDatabases: publicProcedure.query(async() => {
        return dummyData.databases;
    }),
    getDatabaseByCodeName: publicProcedure
        .input(z.string())
        .query(async(opts) => {
            const codeName = opts.input;

            return dummyData.databases.find((item) => item.codeName === codeName);
        }),
};