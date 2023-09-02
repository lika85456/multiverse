import { Bucket, Function } from "sst/constructs";
import type { StackContext } from "sst/constructs";
import { RemovalPolicy } from "aws-cdk-lib/core";
import type { SSTConfig } from "sst";
import DynamoChangesStorageStack from "@multiverse/multiverse/src/ChangesStorage/DynamoChangesStorageStack";

function MultiverseStack({ stack }: StackContext) {
    const changesTable = DynamoChangesStorageStack(stack);

    const snapshotStorage = new Bucket(stack, "multiverse-snapshots", { cdk: { bucket: { removalPolicy: RemovalPolicy.DESTROY } } });

    // orchestrator function
    const orchestratorLambda = new Function(stack, "orchestrator", {
        handler: "packages/orchestrator/src/index.handler",
        runtime: "nodejs18.x",
        memorySize: 256,
        timeout: 10,
        environment: {
            CHANGES_TABLE_NAME: changesTable.tableName,
            SNAPSHOT_STORAGE_BUCKET_NAME: snapshotStorage.bucketName
        }
    });

    // add access to the table and bucket
    orchestratorLambda.attachPermissions([
        changesTable,
        snapshotStorage
    ]);

    stack.addOutputs({ orchestratorLambdaArn: orchestratorLambda.functionArn });
}

// https://docs.sst.dev/configuring-sst
export default {
    config(input) {
        return {
            name: "multiverse",
            // region: input.region,
            region: "eu-central-1",
            // stage: input.stage
        };
    },
    stacks(app) {
        app.stack(MultiverseStack);
    },
} as SSTConfig;