import {
    Cron, NextjsSite, StaticSite, Bucket
} from "sst/constructs";
import type { StackContext } from "sst/constructs";
import type { SSTConfig } from "sst";
import { sstENV } from "./apps/multiverse-ui/src/lib/sstEnv";

function MultiverseStack({ stack }: StackContext) {

    const docsWeb = new StaticSite(stack, "docs", {
        path: "./apps/docs",
        buildOutput: "build",
        // buildCommand: "pnpm -C ../../ run build:tsdocs && pnpm run build",
        buildCommand: "pnpm run build"
    });

    const orchestratorSourceBucket = new Bucket(stack, "OrchestratorSourceBucket");

    const nextSite = new NextjsSite(stack, "app", {
        path: "./apps/multiverse-ui",
        timeout: 60,
        environment: sstENV,
        memorySize: "256 MB",
        runtime: "nodejs20.x",
        bind: [orchestratorSourceBucket]
    });

    const cron = new Cron(stack, "Cron", {
        schedule: "rate(1 hour)", // or (5 minutes). (1 minute) for testing
        // job: "apps/multiverse-ui/src/lib/statistics-processor/index.start",
        job: {
            function: {
                environment: sstENV,
                memorySize: "256 MB",
                timeout: 20,
                runtime: "nodejs20.x",
                handler: "apps/multiverse-ui/src/lib/statistics-processor/index.start",
            },
        },
    });

    stack.addOutputs({
        docsUrl: docsWeb.cdk?.distribution.distributionDomainName,
        appUrl: nextSite.url,
        serverLambda: nextSite.cdk?.function?.functionName,
        cron: cron.cdk.rule.ruleName,
        orchestratorSourceBucket: orchestratorSourceBucket.bucketName,
    });
}

// https://docs.sst.dev/configuring-sst
export default {
    config(input) {
        return {
            name: "multiverse",
            // region: input.region,
            region: "eu-central-1",
            stage: input.stage ?? "dev"
        };
    },
    stacks(app) {
        app.stack(MultiverseStack);

    },
} as SSTConfig;