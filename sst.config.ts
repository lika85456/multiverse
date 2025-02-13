/// <reference path="./.sst/platform/config.d.ts" />

import { sstENV } from "./apps/multiverse-ui/src/lib/sstEnv";

export default $config({
    app(input) {
        return {
            name: "multiverse",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
        };
    },
    async run() {
        const docs = new sst.aws.StaticSite("Docs", {
            path: "./apps/docs",
            build: {
                output: "build",
                command: "pnpm run build",
            }
        });

        const app = new sst.aws.Nextjs("AppFrontend", {
            path: "./apps/multiverse-ui",
            environment: sstENV,
            link: [orchestratorSourceBucket],
            transform: {
                server: {
                    memory: "256 MB",
                    runtime: "nodejs20.x",
                    timeout: "300 seconds",
                }
            }
        });

        new sst.aws.Cron("Cron", {
            schedule: "rate(1 hour)",
            job: {
                handler: "apps/multiverse-ui/src/lib/statistics-processor/index.start",
                timeout: "60 seconds",
                memory: "256 MB",
                environment: sstENV,
            },
        });

        return {
            appUrl: app.url,
            docsUrl: docs.url
        };
    },
});