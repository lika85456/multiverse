import { vectorDatabaseQuerySchema } from "./Vector";
import type VectorDatabase from "./VectorDatabase";
import { publicProcedure, router } from "./trpc";

export const generateAppRouter = (vdb: VectorDatabase) => router({
    ping: publicProcedure
        .query(() => {
            return "pong";
        }),
    dbQuery: publicProcedure
        .input(vectorDatabaseQuerySchema)
        .query(async({ input: { query, updates } }) => {
            const result = await vdb.query({
                query,
                updates
            });

            return {
                partition: result.partition,
                result: result.result,
                instanceId: result.instanceId,
                lastUpdateTimestamp: result.lastUpdateTimestamp
            };
        })

});

export type AppRouter = ReturnType<typeof generateAppRouter>;