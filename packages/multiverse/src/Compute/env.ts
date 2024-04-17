import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";
import log from "@multiverse/log";
import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";
import { databaseId } from "../core/DatabaseConfiguration";

config({ path: path.join(__dirname, "..", "..", "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"), });

export const databaseEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CHANGES_TABLE: z.string(),
    SNAPSHOT_BUCKET: z.string(),
    DATABASE_IDENTIFIER: databaseId,
    DATABASE_CONFIG: z.string().transform<DatabaseConfiguration>(value => JSON.parse(value)),
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
        DATABASE_IDENTIFIER: {
            name: "multiverse-dev",
            region: "eu-central-1"
        },
        DATABASE_CONFIG: {
            dimensions: 1536,
            space: "cosine"
        },
        PARTITION: 0,
    };
} else {
    env = databaseEnvSchema.parse(process.env);
}

export const DATABASE_ENV = env;