import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { MultiverseMock } from "@/server/multiverse-interface/MultiverseMock";

export const secretToken = router({
    post: publicProcedure.input(z.object({
        codeName: z.string(),
        secretToken: z.object({
            name: z.string(),
            validUntil: z.number(),
        }),
    })).mutation(async(opts): Promise<void> => {
        const multiverse = new MultiverseMock();
        const multiverseDatabase = await multiverse.getDatabase(opts.input.codeName);
        if (!multiverseDatabase) {
            throw new Error("Database not found");
        }

        await multiverseDatabase.addToken({
            name: opts.input.secretToken.name,
            validUntil: opts.input.secretToken.validUntil,
        });
    }),
    delete: publicProcedure.input(z.object({
        codeName: z.string(),
        tokenName: z.string(),
    })).mutation(async(opts): Promise<void> => {
        const multiverse = new MultiverseMock();
        const multiverseDatabase = await multiverse.getDatabase(opts.input.codeName);
        if (!multiverseDatabase) {
            throw new Error("Database not found");
        }

        await multiverseDatabase.removeToken(opts.input.tokenName);
    }),
});