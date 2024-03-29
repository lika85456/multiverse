import { router } from "@/server/trpc";
import { databaseMethods } from "@/server/methods/database";
import { statisticsMethods } from "@/server/methods/statistics";
import { accountMethods } from "@/server/methods/account";
import { databaseBrowserMethods } from "@/server/methods/database-browser";

export const appRouter = router({
    ...databaseMethods,
    ...statisticsMethods,
    ...accountMethods,
    ...databaseBrowserMethods,
});

export type AppRouter = typeof appRouter;