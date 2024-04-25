import {
    Cron, NextjsSite, StaticSite
} from "sst/constructs";
import type { StackContext } from "sst/constructs";
import type { SSTConfig } from "sst";
import { ENV } from "./apps/multiverse-ui/src/lib/env";

function MultiverseStack({ stack }: StackContext) {

    const docsWeb = new StaticSite(stack, "docs", {
        path: "./apps/docs",
        buildOutput: "build",
        // buildCommand: "pnpm -C ../../ run build:tsdocs && pnpm run build",
        buildCommand: "pnpm run build"
    });

    const nextSite = new NextjsSite(stack, "app", {
        path: "./apps/multiverse-ui",
        timeout: 10,
        memorySize: "256 MB",
        runtime: "nodejs20.x",
    });

    console.log(JSON.stringify(ENV, null, 2));

    const cron = new Cron(stack, "Cron", {
        schedule: "rate(1 hour)", // or (5 minutes). (1 minute) for testing
        // job: "apps/multiverse-ui/src/lib/statistics-processor/index.start",
        job: {
            function: {
                environment: { ...ENV },
                memorySize: "256 MB",
                timeout: 20,
                runtime: "nodejs20.x",
                handler: "apps/multiverse-ui/src/lib/statistics-processor/index.start",
            },
        },
    });

    console.log(cron.jobFunction.env);

    stack.addOutputs({
        docsUrl: docsWeb.cdk?.distribution.distributionDomainName,
        appUrl: nextSite.url,
        serverLambda: nextSite.cdk?.function?.functionName,
        cron: cron.cdk.rule.ruleName,
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