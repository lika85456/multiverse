/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./.sst/platform/config.d.ts" />

import { sstENV } from "./apps/ui/src/lib/sstEnv";
import { exec } from "child_process";

export default $config({
    app(input) {
        return {
            name: "multiverse",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
            providers: { aws: { region: "eu-west-1" } }
        };
    },
    async run() {
        // const docs = new sst.aws.StaticSite("Docs", {
        //     path: "./apps/docs",
        //     build: {
        //         output: "build",
        //         command: "pnpm run build",
        //     }
        // });

        const buildBucket = new sst.aws.Bucket("mv-build-bucket-dev");

        const app = new sst.aws.Nextjs("AppFrontend", {
            path: "./apps/ui",
            environment: sstENV,
            link: [buildBucket],
            transform: {
                server: {
                    memory: "256 MB",
                    runtime: "nodejs20.x",
                    timeout: "300 seconds",
                }
            },
            permissions: [
                {
                    // add iam get role
                    actions: ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PutRolePolicy", "iam:GetRole"],
                    resources: ["*"]
                }
            ]
            // buildCommand: `bunx @opennextjs/aws@latest build`
        });
        // bun bin/deployOrchestrator.ts ${buildBucket.name.apply()} eu-west-1 &&

        buildBucket.name.apply(name => {
            exec(`bun bin/deployOrchestrator.ts ${name} eu-west-1`);
        });

        // new sst.aws.Cron("Cron", {
        //     schedule: "rate(1 hour)",
        //     job: {
        //         handler: "apps/ui/src/lib/statistics-processor/index.start",
        //         timeout: "60 seconds",
        //         memory: "256 MB",
        //         environment: sstENV,
        //     },
        // });

        return {
            appUrl: app.url,
            // docsUrl: docs.url
        };
    },
});