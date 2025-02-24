/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./.sst/platform/config.d.ts" />

import { sstENV } from "./apps/ui/src/lib/sstEnv";

export default $config({
    app(input) {
        return {
            name: "multiverse",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
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

        const app = new sst.aws.Nextjs("AppFrontend", {
            path: "./apps/ui",
            environment: sstENV,
            transform: {
                server: {
                    memory: "256 MB",
                    runtime: "nodejs20.x",
                    timeout: "300 seconds",
                }
            },
            // openNextVersion: "3.1.1"..
            // buildCommand: "bunx @opennextjs/aws@latest build"
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