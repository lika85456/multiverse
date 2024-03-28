import { publicProcedure } from "@/server/trpc";
import z from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const accountMethods = {
    getAwsToken: publicProcedure.query(async() => {
        if (true) {
            return {
                accessTokenId: "44b2d438d65261a9eb14f61b215a13e974342afe8f5d811",
                secretAccessKey:
          "c975e5a171bcde0588a51e2d7a5d6b2e7696a38639aba7f92724dedaa37b6c4c650d9f7f72e174314c172874f4314e5a746066c26c35c9631",
            };
        }

        return undefined;
    }),
    removeAwsToken: publicProcedure.query(async() => {
        return {};
    }),
    addAwsToken: publicProcedure
        .input(z.object({
            accessTokenId: z.string(),
            secretAccessKey: z.string(),
        }),)
        .mutation(async(opts) => {
            const session = await getServerSession(authOptions);
            const sessionUser = session?.user;
            if (!sessionUser || !sessionUser.email) {
                throw new Error("Session not found");
            }

            return {};
        }),
};