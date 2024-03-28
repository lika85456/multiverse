import { publicProcedure } from "@/server/trpc";
import z from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const accountMethods = {
    getAwsToken: publicProcedure.query(async() => {
        return {
            accessTokenId: "token private",
            secretAccessKey: "token public",
        };
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