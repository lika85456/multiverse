import { publicProcedure, router } from "@/server/trpc";
import type { QueryResult } from "@multiverse/multiverse/src/core/Query";
import z from "zod";
import { MultiverseMock } from "@/server/multiverse-interface/MultiverseMock";
import type { IMultiverse } from "@multiverse/multiverse/src";

import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import { MultiverseFactory } from "@/server/multiverse-interface/MultiverseFactory";
export const vector = router({
    query: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.number()),
        k: z.number(),
    })).mutation(async(opts): Promise<QueryResult> => {
        const multiverse = await (new MultiverseFactory()).getMultiverse();
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
    post: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.object({
            vector: z.array(z.number()),
            label: z.string(),
            metadata: z.record(z.string()).optional(),
        })),
    })).mutation(async(opts): Promise<void> => {
        const multiverse = await (new MultiverseFactory()).getMultiverse();
        const multiverseDatabase = await multiverse.getDatabase(opts.input.database);

        if (!multiverseDatabase) {
            throw new Error("Database not found");
        }
        const newVector: NewVector[] = opts.input.vector;
        await multiverseDatabase.add(newVector);
    }),
    delete: publicProcedure.input(z.object({
        database: z.string(),
        label: z.string(),
    })).mutation(async(opts): Promise<void> => {
        const multiverse = await (new MultiverseFactory()).getMultiverse();
        const multiverseDatabase = await multiverse.getDatabase(opts.input.database);

        if (!multiverseDatabase) {
            throw new Error("Database not found");
        }

        await multiverseDatabase.remove([opts.input.label]);
    }),
});