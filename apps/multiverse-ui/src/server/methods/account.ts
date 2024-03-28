import { publicProcedure } from "@/server/trpc";
import z from "zod";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import {
    addAwsToken,
    getAwsTokenByOwner,
    removeAwsToken,
} from "@/lib/mongodb/collections/aws-token";
import { deleteAllDatabases } from "@/lib/mongodb/collections/database";

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
                // secretAccessKey: awsToken.secretAccessKey, // do not return on frontend
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
        const tokenRemovalResult = await removeAwsToken();
        const deleteDatabasesResult = await deleteAllDatabases();

        //TODO - perform full cleanup of user data
        return tokenRemovalResult && deleteDatabasesResult;
    }),
};