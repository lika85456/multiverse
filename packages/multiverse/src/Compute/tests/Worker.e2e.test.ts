import BucketChangesStorage from "../../ChangesStorage/BucketChangesStorage";
import type { DatabaseID, DatabaseConfiguration } from "../../core/DatabaseConfiguration";
import S3SnapshotStorage from "../../SnapshotStorage/S3SnapshotStorage";
import LambdaWorker from "../LambdaWorker";
import workerTest from "./workerTest";

function initializeLambdaWorker({
    databaseId,
    config
}: {
    databaseId: DatabaseID;
    config: DatabaseConfiguration;
}) {
    const snapshotBucketName = "multiverse-snapshot-bucket-" + Math.random().toString(36).substring(7);

    const worker = new LambdaWorker({
        lambdaName: "multiverse-lambda-worker-test-" + Math.random().toString(36).substring(7),
        region: "eu-west-1",
        awsToken: undefined as any
    });

    const snapshotStorage = new S3SnapshotStorage({
        bucketName: snapshotBucketName,
        databaseId,
        awsToken: undefined as any
    });

    const changesStorage = new BucketChangesStorage("multiverse-changes-" + databaseId.name, {
        region: databaseId.region,
        awsToken: undefined as any,
        maxObjectAge: 1000 * 60 * 60 // 1 hour
    });

    const deploy = async() => {
        await snapshotStorage.deploy();

        await worker.deploy({
            env: "development",
            partition: 0,
            snapshotBucket: snapshotBucketName,
            configuration: config,
            databaseId,
            changesStorage: changesStorage.getResourceName()
        });
    };

    const destroy = async() => {
        await Promise.allSettled([
            worker.destroy(),
            snapshotStorage.destroy()
        ]);
    };

    return {
        worker,
        snapshotStorage,
        config,
        deploy,
        destroy
    };
}

describe("<Worker - Fully remote lambda worker>", () => {
    workerTest(initializeLambdaWorker);
});