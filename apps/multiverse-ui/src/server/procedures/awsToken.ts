import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import {
    addAwsToken, getAwsTokenByAccessTokenId,
    getAwsTokenByOwner,
    removeAwsToken,
} from "@/lib/mongodb/collections/aws-token";
import { deleteAllDatabases } from "@/lib/mongodb/collections/database";
import { TRPCError } from "@trpc/server";
import { MultiverseFactory } from "@/server/multiverse-interface/MultiverseFactory";

export const awsToken = router({
    /**
     * Get the aws token of the user.
     */
    get: publicProcedure.query(async() => {
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
    /**
     * Add the aws token to the user. Token is stored into the mongodb
     */
    post: publicProcedure
        .input(z.object({
            accessTokenId: z.string(),
            secretAccessKey: z.string(),
        }),)
        .mutation(async(opts) => {
            const existingToken = await getAwsTokenByAccessTokenId(opts.input.accessTokenId);
            if (existingToken) {
                throw new Error("Token already exists");
            }

            return await addAwsToken({
                accessTokenId: opts.input.accessTokenId,
                secretAccessKey: opts.input.secretAccessKey,
            });
        }),
    /**
     * Remove the aws token from the user.
     * Complete cleanup will start. This will delete all databases in the multiverse and mongodb
     * @returns {boolean} - true if the token is removed and all databases are deleted
     */
    delete: publicProcedure.mutation(async() => {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "User not found",
            });
        }

        // delete all databases in the mongodb
        const deleteDatabasesResult = await deleteAllDatabases(sessionUser._id);
        if (!deleteDatabasesResult) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Error deleting databases"
            });
        }

        // delete all databases in the multiverse
        for (const database of sessionUser.databases) {
            const multiverse = await (new MultiverseFactory()).getMultiverse();
            await multiverse.removeDatabase(database);
        }

        // delete aws token from mongodb
        const tokenRemovalResult = await removeAwsToken();

        return tokenRemovalResult && deleteDatabasesResult;
    }),
});