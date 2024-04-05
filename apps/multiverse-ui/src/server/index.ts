import { router } from "@/server/trpc";
import { database, } from "@/server/procedures/database";
import { statistics, } from "@/server/procedures/statistics";
import { awsToken } from "@/server/procedures/awsToken";

export const appRouter = router({
    database,
    statistics,
    awsToken
});

export type AppRouter = typeof appRouter;