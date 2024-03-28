import { publicProcedure } from "@/server/trpc";
import z from "zod";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import {
    addAwsToken,
    getAwsTokenByOwner,
    removeAwsToken,
} from "@/lib/mongodb/collections/aws-token";

export const accountMethods = {
    getAwsToken: publicProcedure.query(async() => {
        const user = await getSessionUser();
        if (!user) {
            throw new Error("User not found");
        }

        const awsToken = await getAwsTokenByOwner(user._id);

        if (awsToken) {
            return {
                accessTokenId: awsToken.accessTokenId,
                ownerId: awsToken.ownerId,
            };
        }

        return null;
    }),
    addAwsToken: publicProcedure
        .input(z.object({
            accessTokenId: z.string(),
            secretAccessKey: z.string(),
        }),)
        .mutation(async(opts) => {
            return await addAwsToken({
                accessTokenId: opts.input.accessTokenId,
                secretAccessKey: opts.input.secretAccessKey,
            });
        }),
    removeAwsToken: publicProcedure.mutation(async() => {
        return await removeAwsToken();
    }),
};