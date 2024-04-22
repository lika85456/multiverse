import { z } from "zod";
import { databaseId, databaseConfiguration } from "../core/DatabaseConfiguration";

export const databaseEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SNAPSHOT_BUCKET: z.string(),
    DATABASE_IDENTIFIER: databaseId,
    DATABASE_CONFIG: databaseConfiguration,
    PARTITION: z.number()
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvSchema>;