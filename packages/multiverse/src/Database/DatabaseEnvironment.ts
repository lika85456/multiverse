import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";
import type { IndexConfiguration } from "../IndexConfiguration";

config({ path: path.join(__dirname, "..", "..", "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"), });

export const databaseEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CHANGES_TABLE: z.string(),
    SNAPSHOT_BUCKET: z.string(),
    INDEX_CONFIG: z.string().transform<IndexConfiguration>(value => JSON.parse(value)),
    PARTITION: z.string().transform<number>(value => parseInt(value)),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvSchema>;

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = databaseEnvSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const DATABASE_ENV = databaseEnvSchema.parse(process.env);