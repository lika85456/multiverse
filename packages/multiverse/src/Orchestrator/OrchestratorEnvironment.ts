import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";
import type { StoredDatabaseConfiguration } from "../core/DatabaseConfiguration";

config({ path: path.join(__dirname, "..", "..", "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"), });

export const orchestratorEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CHANGES_TABLE: z.string(),
    SNAPSHOT_BUCKET: z.string(),
    DATABASE_CONFIG: z.string().transform<StoredDatabaseConfiguration>(value => JSON.parse(value)),
    INFRASTRUCTURE_TABLE: z.string(),
});

export type OrchestratorEnvironment = z.infer<typeof orchestratorEnvSchema>;

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = orchestratorEnvSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const ORCHESTRATOR_ENV = orchestratorEnvSchema.parse(process.env);