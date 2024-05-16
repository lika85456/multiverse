import z from "zod";
import { prettifyIssues } from "@multiverse/env/.turbo/src";
import { config } from "dotenv";

config({ path: "../../../.env", }); // __dirname is not available for cron environment

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    SECRET_KEY: z.string(),
    NEXTAUTH_SECRET_KEY: z.string(),
    NEXTAUTH_URL: z.string(),
    DOCS_URL: z.string(),
    MONGODB_URI: z.string(),
    GOOGLE_ID: z.string(),
    GOOGLE_SECRET: z.string(),
    GITHUB_ID: z.string(),
    GITHUB_SECRET: z.string(),
    SMTP_USER: z.string(),
    SMTP_PASSWORD: z.string(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string(),
    EMAIL_FROM: z.string(),
});

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const ENV = envSchema.parse(process.env);