import type { DatabaseID, DatabaseConfiguration } from "../../core/DatabaseConfiguration";
import LocalIndex from "../../Index/LocalIndex";
import S3SnapshotStorage from "../../SnapshotStorage/S3SnapshotStorage";
import ComputeWorker from "../ComputeWorker";
import workerTest from "./workerTest";

function initializeLocalWorkerWithAWSStorages({
    databaseId,
    config
}: {
    databaseId: DatabaseID;
    config: DatabaseConfiguration;
}) {
    const snapshotBucketName = "multiverse-snapshot-bucket-" + Math.random().toString(36).substring(7);

    const snapshotStorage = new S3SnapshotStorage({
        bucketName: snapshotBucketName,
        databaseId,
        awsToken: undefined as any
    });

    const worker = new ComputeWorker({
        partitionIndex: 0,
        snapshotStorage,
        index: new LocalIndex(config),
        memoryLimit: 1000,
        ephemeralLimit: 1000
    });

    const deploy = async() => {
        await snapshotStorage.deploy();
    };

    const destroy = async() => {
        await snapshotStorage.destroy();
    };

    return {
        worker,
        snapshotStorage,
        config,
        deploy,
        destroy
    };
}

describe("<ComputeWorker - Local with AWS storages>", () => {
    workerTest(initializeLocalWorkerWithAWSStorages);
});