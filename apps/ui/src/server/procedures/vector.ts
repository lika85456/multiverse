import { publicProcedure, router } from "@/server/trpc";
import type { QueryResult } from "@multiverse/multiverse/src/core/Query";
import z from "zod";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import log from "@multiverse/log";
import { getRelatedDatabase, normalizeString } from "@/server/procedures/database";
import { handleError } from "@/server";

export const vector = router({
    /**
     * Perform a query on the database.
     * @param database - the database to query
     * @param vector - the vector to query
     * @param k - the number of results to return
     */
    query: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.number()),
        k: z.number(),
    })).mutation(async(opts): Promise<QueryResult> => {
        try {
            log.info(`Performing query on database ${opts.input.database}`);
            const { multiverseDatabase } = await getRelatedDatabase(opts.input.database);

            return multiverseDatabase.query({
                vector: opts.input.vector,
                k: opts.input.k,
                sendVector: false
            });
        } catch (error) {
            throw handleError({
                error,
                logMessage: `Error performing query on database ${opts.input.database}`,
                errorMessage: "Error performing query"
            });
        }
    }),
    /**
     * Add a new vector to the database.
     * @param database - the database to add the vector to
     * @param vector - the vector to add
     */
    post: publicProcedure.input(z.object({
        database: z.string(),
        vector: z.array(z.object({
            vector: z.array(z.number()),
            label: z.string(),
            metadata: z.record(z.string()).optional(),
        })),
    })).mutation(async(opts): Promise<void> => {
        try {
            log.info("Adding new vector to database", opts.input.database);
            const { multiverseDatabase } = await getRelatedDatabase(opts.input.database);

            const newVector: NewVector[] = opts.input.vector.map(vector => ({
                vector: vector.vector,
                label: normalizeString(vector.label),
                metadata: vector.metadata,
            }));
            await multiverseDatabase.add(newVector);
        } catch (error) {
            throw handleError({
                error,
                logMessage: `Error adding vector to database ${opts.input.database}`,
                errorMessage: "Error adding vector to database"
            });
        }
    }),
    /**
     * Delete a vector from the database.
     * @param database - the database to delete the vector from
     * @param label - the label of the vector to delete
     */
    delete: publicProcedure.input(z.object({
        database: z.string(),
        label: z.string(),
    })).mutation(async(opts): Promise<void> => {
        try {
            log.info("Removing vector from database", opts.input.database);
            const { multiverseDatabase } = await getRelatedDatabase(opts.input.database);
            await multiverseDatabase.remove([opts.input.label]);
        } catch (error) {
            throw handleError({
                error,
                logMessage: `Error deleting vector from database ${opts.input.database}`,
                errorMessage: "Error deleting vector from database"
            });
        }
    }),
});