import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { getRelatedDatabase, normalizeString } from "@/server/procedures/database";
import { TRPCError } from "@trpc/server";
import log from "@multiverse/log";
import { handleError } from "@/server";
import { generateHex } from "@/lib/multiverse-interface/MultiverseMock";

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
        try {
            const { multiverseDatabase } = await getRelatedDatabase(opts.input.codeName);
            const tokens = (await multiverseDatabase.getConfiguration()).secretTokens;
            if (tokens.find(token => token.name === opts.input.secretToken.name)) {
                log.error(`Token with name ${opts.input.secretToken.name} already exists`);
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Token already exists",
                });
            }
            await multiverseDatabase.addToken({
                name: normalizeString(opts.input.secretToken.name, MAX_TOKEN_NAME_LENGTH),
                secret: generateHex(16),
                validUntil: opts.input.secretToken.validUntil,
            });
        } catch (error) {
            throw handleError({
                error,
                logMessage: `Error adding token ${opts.input.secretToken.name} to database ${opts.input.codeName}`,
                errorMessage: "Error adding token"
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
        try {
            if (opts.input.tokenName === "default") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot remove default token",
                });
            }
            const { multiverseDatabase } = await getRelatedDatabase(opts.input.codeName);
            await multiverseDatabase.removeToken(opts.input.tokenName);
        } catch (error) {
            throw handleError({
                error,
                logMessage: `Error removing token ${opts.input.tokenName} from database ${opts.input.codeName}`,
                errorMessage: "Error removing token"
            });
        }
    }),
});