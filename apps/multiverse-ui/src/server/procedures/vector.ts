import { publicProcedure, router } from "@/server/trpc";
import type { QueryResult } from "@multiverse/multiverse/src/core/Query";
import z from "zod";
import { MultiverseMock } from "@/server/multiverse-interface/MultiverseMock";
import type { IMultiverse } from "@multiverse/multiverse/src";

export const vector = router({
    query: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.number()),
        k: z.number(),
    })).mutation(async(opts): Promise<QueryResult> => {
        const multiverse = new MultiverseMock() as IMultiverse;
        const multiverseDatabase = await multiverse.getDatabase(opts.input.database);

        if (!multiverseDatabase) {
            throw new Error("Database not found");
        }

        return multiverseDatabase.query({
            vector: opts.input.vector,
            k: opts.input.k,
            sendVector: false
        });
    }),
});