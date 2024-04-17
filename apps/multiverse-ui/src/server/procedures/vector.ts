import { publicProcedure, router } from "@/server/trpc";
import type { QueryResult } from "@multiverse/multiverse/src/core/Query";
import z from "zod";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import log from "@multiverse/log";
import { getRelatedDatabase, normalizeString } from "@/server/procedures/database";
import { TRPCError } from "@trpc/server";

export const vector = router({
    query: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.number()),
        k: z.number(),
    })).mutation(async(opts): Promise<QueryResult> => {
        log.info(`Performing query on database ${opts.input.database}`);
        const multiverseDatabase = await getRelatedDatabase(opts.input.database);

        try {
            return multiverseDatabase.query({
                vector: opts.input.vector,
                k: opts.input.k,
                sendVector: false
            });
        } catch (error) {
            log.error(`Error querying database ${opts.input.database}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Error querying database ${opts.input.database}`,
            });
        }
    }),
    post: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.object({
            vector: z.array(z.number()),
            label: z.string(),
            metadata: z.record(z.string()).optional(),
        })),
    })).mutation(async(opts): Promise<void> => {
        log.info("Adding new vector to database", opts.input.database);
        const multiverseDatabase = await getRelatedDatabase(opts.input.database);

        const newVector: NewVector[] = opts.input.vector.map(vector => ({
            vector: vector.vector,
            label: normalizeString(vector.label),
            metadata: vector.metadata,
        }));

        try {
            await multiverseDatabase.add(newVector);
        } catch (error) {
            log.error(`Error adding vector to database ${opts.input.database}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Error adding vector to database ${opts.input.database}`,
            });
        }
    }),
    delete: publicProcedure.input(z.object({
        database: z.string(),
        label: z.string(),
    })).mutation(async(opts): Promise<void> => {
        log.info("Removing vector from database", opts.input.database);
        const multiverseDatabase = await getRelatedDatabase(opts.input.database);

        try {
            await multiverseDatabase.remove([opts.input.label]);
        } catch (error) {
            log.error(`Error deleting vector from database ${opts.input.database}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Error deleting vector from database ${opts.input.database}`,
            });
        }
        await multiverseDatabase.remove([opts.input.label]);
    }),
});