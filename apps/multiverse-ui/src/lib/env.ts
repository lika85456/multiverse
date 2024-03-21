import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";

config({
    path: path.join(
        __dirname,
        "..",
        "..",
        "..",
        process.env.NODE_ENV === "test" ? ".env.test" : ".env",
    ),
});

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    GITHUB_ID: z.string(),
    GITHUB_SECRET: z.string(),
    GOOGLE_ID: z.string(),
    GOOGLE_SECRET: z.string(),
});

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const ENV = envSchema.parse(process.env);