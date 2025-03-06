/* eslint-disable turbo/no-undeclared-env-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { prettifyIssues } from "@multiverse/env";
import { databaseEnvSchema } from "./EnvSchema";
import type { z } from "zod";
// import log from "@multiverse/log";

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = databaseEnvSchema.safeParse(JSON.parse(process.env.VARIABLES!));
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

const env = databaseEnvSchema.parse(JSON.parse(process.env.VARIABLES!));

export const DATABASE_ENV = env;