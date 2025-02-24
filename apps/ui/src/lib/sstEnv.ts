import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";

config({ path: "./apps/ui/.env", }); // __dirname is not available for cron environment

const cronEnvSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    SECRET_KEY: z.string(),
    NEXTAUTH_SECRET_KEY: z.string(),
    NEXTAUTH_URL: z.string(),
    DOCS_URL: z.string(),
    GOOGLE_ID: z.string(),
    MONGODB_URI: z.string(),
    GOOGLE_SECRET: z.string(),
    GITHUB_ID: z.string(),
    GITHUB_SECRET: z.string(),
    SMTP_USER: z.string(),
    SMTP_PASSWORD: z.string(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string(),
    EMAIL_FROM: z.string(),
    ORCHESTRATOR_SOURCE_BUCKET: z.string(),
});

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = cronEnvSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const sstENV = cronEnvSchema.parse(process.env);