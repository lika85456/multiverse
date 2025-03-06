import BucketChangesStorage from "../../ChangesStorage/BucketChangesStorage";
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
    const changesBucketName = "multiverse-changes-bucket-" + Math.random().toString(36).substring(7);

    const snapshotStorage = new S3SnapshotStorage({
        bucketName: snapshotBucketName,
        databaseId,
        awsToken: undefined as any
    });

    const changesStorage = new BucketChangesStorage(changesBucketName, {
        awsToken: undefined as any,
        maxObjectAge: 1000 * 60 * 60, // 1 hour
        region: databaseId.region
    });

    const worker = new ComputeWorker({
        partitionIndex: 0,
        snapshotStorage,
        index: new LocalIndex(config),
        memoryLimit: 1000,
        ephemeralLimit: 1000,
        changesStorage
    });

    const deploy = async() => {
        await Promise.all([
            changesStorage.deploy(),
            snapshotStorage.deploy()
        ]);
    };

    const destroy = async() => {
        await Promise.allSettled([
            snapshotStorage.destroy(),
            changesStorage.destroy()
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

describe("<ComputeWorker - Local with AWS storages>", () => {
    workerTest(initializeLocalWorkerWithAWSStorages);
});