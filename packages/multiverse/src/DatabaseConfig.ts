import { z } from "zod";

export const DatabaseConfigSchema = z.object({
    // identifiers
    databaseName: z.string(),
    owner: z.string(),

    // infrastructure
    mainRegion: z.string(),
    secondaryRegions: z.array(z.string()),
    awakeInstances: z.number().positive().default(1),

    // collection
    dimensions: z.number().positive(),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;