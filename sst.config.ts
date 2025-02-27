/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./.sst/platform/config.d.ts" />
import { sstENV } from "./apps/ui/src/lib/sstEnv";
import { exec } from "child_process";

// const repo = new awsx.ecr.Repository("repo");
// export const url = repo.url;

export default $config({
    app(input) {
        return {
            name: "multiverse",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
            providers: {
                aws: { region: "eu-west-1" },
                awsx: "2.21.0"
            },
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
        const buildBucket = new sst.aws.Bucket("orchestrator-build-bucket");

        const ecr = new awsx.ecr.Repository("compute-repository", { forceDelete: true });

        const computeImage = new awsx.ecr.Image("compute-image", {
            repositoryUrl: ecr.url,
            // todo move the context
            context: "./",
            platform: "linux/amd64",
            imageTag: "latest",
            imageName: "compute",
            args: { DOCKER_BUILDKIT: "1", }
        });

        const app = new sst.aws.Nextjs("AppFrontend", {
            path: "./apps/ui",
            environment: sstENV,
            link: [buildBucket, computeImage],
            transform: {
                server: {
                    memory: "256 MB",
                    runtime: "nodejs20.x",
                    timeout: "300 seconds",
                },
            },
            permissions: [
                {
                    // add iam get role
                    actions: [
                        "iam:CreateRole",
                        "iam:AttachRolePolicy",
                        "iam:PutRolePolicy",
                        "iam:GetRole",

                        "ecr:BatchCheckLayerAvailability",
                        "ecr:BatchGetImage",
                        "ecr:GetDownloadUrlForLayer",
                        "ecr:GetAuthorizationToken",
                    ],
                    resources: ["*"],
                },
            ],
            // buildCommand: `bunx @opennextjs/aws@latest build`
        });

        // bun bin/deployOrchestrator.ts ${buildBucket.name.apply()} eu-west-1 &&
        buildBucket.name.apply((name) => {
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