import { router } from "@/app/server/trpc";
import { databaseMethods } from "@/app/server/methods/database";
import { statisticsMethods } from "@/app/server/methods/statistics";
import { accountMethods } from "@/app/server/methods/account";

// export const appRouter = {
//     getConnectionTokens: publicProcedure.query(async() => {
//         return dummyData.tokens;
//     }),
//     getConnectionTokenByDatabase: publicProcedure
//         .input(z.string())
//         .query(async(opts) => {
//             const databaseCodeName = opts.input;
//
//             return dummyData.tokens.find((item) => item.databaseCodeName === databaseCodeName,);
//         }),
//     getConnectionTokenById: publicProcedure
//         .input(z.string())
//         .query(async(opts) => {
//             const tokenId = opts.input;
//
//             return dummyData.tokens.find((item) => item.tokenId === tokenId);
//         }),
//     createConnectionToken: publicProcedure
//         .input(z.object({
//             databaseCodeName: z.string(),
//             name: z.string(),
//             validity: z.number(),
//         }),)
//         .mutation(async(opts) => {
//             const tokenData = "725e6ca495fd5957";
//
//             const {
//                 databaseCodeName, name, validity
//             } = opts.input;
//
//             const tokenId = dummyData.tokens.length + 1;
//
//             dummyData.tokens.push({
//                 tokenId: tokenId.toString(),
//                 databaseCodeName,
//                 name,
//                 tokenData,
//                 validity,
//             });
//
//             return dummyData.tokens.find((item) => item.tokenId === tokenId.toString(),);
//         }),
// };

export const appRouter = router({
    ...databaseMethods,
    ...statisticsMethods,
    ...accountMethods,
});

export type AppRouter = typeof appRouter;