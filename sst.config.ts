import { Bucket, Function } from "sst/constructs";
import { DynamoChangesStorageStack } from "./packages/multiverse/src/ChangesStorage/DynamoChangesStorageStack";
import type { StackContext } from "sst/constructs";
import { RemovalPolicy } from "aws-cdk-lib/core";
import type { SSTConfig } from "sst";

function MultiverseStack({ stack }: StackContext) {
    const changesTable = DynamoChangesStorageStack(stack);

    const snapshotStorage = new Bucket(stack, "snapshots", { cdk: { bucket: { removalPolicy: RemovalPolicy.DESTROY } } });

    // orchestrator function
    const orchestratorLambda = new Function(stack, "orchestrator", {
        handler: "packages/orchestrator/src/index.handler",
        runtime: "nodejs18.x",
        memorySize: 256,
        timeout: 10,
        environment: {
            CHANGES_TABLE: changesTable.tableName,
            SNAPSHOT_BUCKET: snapshotStorage.bucketName
        }
    });

    // add access to the table and bucket
    orchestratorLambda.attachPermissions([
        changesTable,
        snapshotStorage
    ]);

    stack.addOutputs({
        orchestratorLambdaArn: orchestratorLambda.functionArn,
        changesTable: changesTable.tableName,
        snapshotStorage: snapshotStorage.bucketName
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