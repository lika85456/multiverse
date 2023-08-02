import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";
import { DatabaseConfigSchema, CollectionConfigSchema } from "@multiverse/core/dist/DatabaseConfig";

config({ path: path.join(__dirname, "..", "..", "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"), });

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_CONFIG: z.string().transform(v => DatabaseConfigSchema.parse(v)),
    COLLECTION_CONFIG: z.string().transform(v => CollectionConfigSchema.parse(v)),
});

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;
    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const ENV = envSchema.parse(process.env);