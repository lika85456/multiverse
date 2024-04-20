import { z } from "zod";
import { databaseId, storedDatabaseConfiguration } from "../core/DatabaseConfiguration";

export const orchestratorEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CHANGES_TABLE: z.string(),
    SNAPSHOT_BUCKET: z.string(),
    DATABASE_IDENTIFIER: databaseId,
    DATABASE_CONFIG: storedDatabaseConfiguration,
    INFRASTRUCTURE_TABLE: z.string(),
});

export type OrchestratorEnvironment = z.infer<typeof orchestratorEnvSchema>;