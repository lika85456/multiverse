import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { getRelatedDatabase, normalizeString } from "@/server/procedures/database";
import { TRPCError } from "@trpc/server";
import log from "@multiverse/log";

const MAX_TOKEN_NAME_LENGTH = 16;

export const secretToken = router({
    /**
     * Add a secret token to the database.
     * This token can be used to authenticate requests to the database.
     * The token will be valid until the specified date.
     * If a token with the same name already exists, an error will be thrown.
     */
    post: publicProcedure.input(z.object({
        codeName: z.string(),
        secretToken: z.object({
            name: z.string(),
            validUntil: z.number(),
        }),
    })).mutation(async(opts): Promise<void> => {
        const multiverseDatabase = await getRelatedDatabase(opts.input.codeName);
        const tokens = (await multiverseDatabase.getConfiguration()).secretTokens;
        if (tokens.find(token => token.name === opts.input.secretToken.name)) {
            log.error(`Token with name ${opts.input.secretToken.name} already exists`);
            throw new TRPCError({
                code: "CONFLICT",
                message: "Token already exists",
            });
        }
        try {
            await multiverseDatabase.addToken({
                name: normalizeString(opts.input.secretToken.name, MAX_TOKEN_NAME_LENGTH),
                validUntil: opts.input.secretToken.validUntil,
            });
        } catch (error) {
            log.error(`Error adding token to database ${opts.input.codeName}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Error adding token to database ${opts.input.codeName}`,
            });
        }
    }),
    /**
     * Remove a secret token from the database.
     * This will revoke the token, and it will no longer be valid.
     */
    delete: publicProcedure.input(z.object({
        codeName: z.string(),
        tokenName: z.string(),
    })).mutation(async(opts): Promise<void> => {
        const multiverseDatabase = await getRelatedDatabase(opts.input.codeName);

        try {
            await multiverseDatabase.removeToken(opts.input.tokenName);
        } catch (error) {
            log.error(`Error removing token from database ${opts.input.codeName}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Error removing token from database ${opts.input.codeName}`,
            });
        }
    }),
});