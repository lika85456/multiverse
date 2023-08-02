import { z } from "zod";

export const DatabaseConfigSchema = z.object({
    databaseName: z.string(),
    mainRegion: z.string(),
    secondaryRegions: z.array(z.string()),
    awakeInstances: z.number().positive().default(1)
});

export const CollectionConfigSchema = z.union([
    z.object({
        collectionName: z.string(),
        dimensions: z.number(),
        type: z.literal("dynamic"),
    }),
    z.object({
        collectionName: z.string(),
        dimensions: z.number(),
        type: z.literal("static"),
        size: z.number(),
    }),
]);

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type CollectionConfig = z.infer<typeof CollectionConfigSchema>;