import { z } from "zod";

export type IndexSpace = "l2" | "cosine" | "ip";

export const IndexConfiguration = z.object({
    // identifiers
    indexName: z.string(),
    owner: z.string(),

    // infrastructure
    region: z.string(),
    // other settings should be set by service
    // secondaryRegions: z.array(z.string()),
    // awakeInstances: z.number().positive().default(1),

    // index
    dimensions: z.number().positive(),
    space: z.instanceof(String) as unknown as z.ZodType<IndexSpace>,
});

export type IndexConfiguration = z.infer<typeof IndexConfiguration>;