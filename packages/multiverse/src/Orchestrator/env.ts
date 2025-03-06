/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { orchestratorEnvSchema } from "./EnvSchema";
import log from "@multiverse/log";

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = orchestratorEnvSchema.safeParse(JSON.parse(process.env.VARIABLES!));
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

log.debug("Orchestrator environment loaded", { processEnv: process.env });

export const ORCHESTRATOR_ENV = orchestratorEnvSchema.parse(JSON.parse(process.env.VARIABLES!));