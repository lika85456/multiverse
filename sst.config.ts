import { NextjsSite, StaticSite } from "sst/constructs";
import type { StackContext } from "sst/constructs";
import type { SSTConfig } from "sst";

function MultiverseStack({ stack }: StackContext) {

    const docsWeb = new StaticSite(stack, "docs", {
        path: "./apps/docs",
        buildOutput: "build",
        buildCommand: "pnpm -C ../../ run build:tsdocs && pnpm run build",
    });

    const nextSite = new NextjsSite(stack, "app", {
        path: "./apps/multiverse-ui",
        timeout: 10,
        memorySize: "256 MB",
        runtime: "nodejs20.x",
    });

    stack.addOutputs({ docsUrl: docsWeb.cdk?.distribution.distributionDomainName });
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