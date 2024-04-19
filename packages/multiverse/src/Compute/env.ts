import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";
import { databaseEnvSchema } from "./EnvSchema";
import type { z } from "zod";
// import log from "@multiverse/log";

config({ path: path.join(__dirname, "..", "..", "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"), });

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = databaseEnvSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;

    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

// let env: DatabaseEnvironment;
// if (process.env.NODE_ENV === "development") {
//     log.info("Hard coded development environment loaded.");
//     env = {
//         NODE_ENV: "development",
//         CHANGES_TABLE: "multiverse-changes-dev",
//         SNAPSHOT_BUCKET: "multiverse-snapshots-dev",
//         DATABASE_IDENTIFIER: {
//             name: "multiverse-dev",
//             region: "eu-central-1"
//         },
//         DATABASE_CONFIG: {
//             dimensions: 1536,
//             space: "cosine"
//         },
//         PARTITION: 0,
//     };
// } else {
//     // eslint-disable-next-line turbo/no-undeclared-env-vars
//     env = databaseEnvSchema.parse(JSON.parse(process.env.VARIABLES!));
// }

const env = databaseEnvSchema.parse(process.env);

export const DATABASE_ENV = env;