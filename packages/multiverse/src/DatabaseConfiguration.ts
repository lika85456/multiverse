import { z } from "zod";

export type IndexSpace = "l2" | "cosine" | "ip";
export type Region = "eu-central-1";

export type Token = {
    name: string;
    secret: string;
    validUntil: number;
};

export const DatabaseConfiguration = z.object({
    // identifiers
    name: z.string(),
    // owner: z.string(), // name is not needed here, that will be added in some outer layer

    // infrastructure
    region: z.string() as unknown as z.ZodType<Region>,

    // other settings should be set by service
    // secondaryRegions: z.array(z.string()),
    // awakeInstances: z.number().positive().default(1),

    // index
    dimensions: z.number().positive().max(10000),
    space: z.instanceof(String) as unknown as z.ZodType<IndexSpace>,
});

export type DatabaseConfiguration = z.infer<typeof DatabaseConfiguration>;