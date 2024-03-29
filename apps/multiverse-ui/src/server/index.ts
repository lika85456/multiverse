import { router } from "@/server/trpc";
import { databaseMethods } from "@/server/methods/database";
import { statisticsMethods } from "@/server/methods/statistics";
import { accountMethods } from "@/server/methods/account";

export const appRouter = router({
    ...databaseMethods,
    ...statisticsMethods,
    ...accountMethods,
});

export type AppRouter = typeof appRouter;