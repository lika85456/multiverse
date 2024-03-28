import { z } from "zod";

export type IndexSpace = "l2" | "cosine" | "ip";
export type Region = "eu-central-1";

export type Token = {
    name: string;
    secret: string;
    validUntil: number; // unix timestamp
};

export const DatabaseConfiguration = z.object({
    // identifiers
    name: z.string(),

    // auth
    secretTokens: z.array(z.object({
        name: z.string(),
        secret: z.string(),
        validUntil: z.number().positive(),
    })),

    // infrastructure
    region: z.string() as unknown as z.ZodType<Region>,

    // index
    dimensions: z.number().positive().max(10000),
    space: z.instanceof(String) as unknown as z.ZodType<IndexSpace>,
});

export type DatabaseConfiguration = z.infer<typeof DatabaseConfiguration>;