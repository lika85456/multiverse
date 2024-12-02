import { z } from "zod";

export type IndexSpace = "l2" | "cosine" | "ip";
export type Region = "eu-central-1" | "us-east-1" | "eu-west-1";

export const databaseId = z.object({
    name: z.string(),
    region: z.enum(["eu-central-1", "us-east-1", "eu-west-1"]) as z.ZodType<Region>,
});

export type DatabaseID = z.infer<typeof databaseId>;

export const databaseConfiguration = z.object({
    // statistics
    statisticsQueueName: z.string().optional(),

    // index
    dimensions: z.number().positive().max(10000),
    space: z.enum(["l2", "cosine", "ip"]) as z.ZodType<IndexSpace>,
});

export type DatabaseConfiguration = z.infer<typeof databaseConfiguration>;

export type Token = {
    name: string;
    secret: string;
    validUntil: number; // unix timestamp
};

export const storedDatabaseConfiguration = z.object({
    // auth
    secretTokens: z.array(z.object({
        name: z.string(),
        secret: z.string(),
        validUntil: z.number().positive(),
    })),

}).merge(databaseConfiguration);

export type StoredDatabaseConfiguration = z.infer<typeof storedDatabaseConfiguration>;