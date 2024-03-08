import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";
import type { DatabaseConfiguration } from "../DatabaseConfiguration";
import log from "@multiverse/log";

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

let env: DatabaseEnvironment;
if (process.env.NODE_ENV === "development") {
    log.info("Hard coded development environment loaded.");
    env = {
        NODE_ENV: "development",
        CHANGES_TABLE: "multiverse-changes-dev",
        SNAPSHOT_BUCKET: "multiverse-snapshots-dev",
        INDEX_CONFIG: {
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            dimensions: 1536,
            space: "cosine",
        },
        PARTITION: 0,
    };
} else {
    env = databaseEnvSchema.parse(process.env);
}

export const DATABASE_ENV = env;