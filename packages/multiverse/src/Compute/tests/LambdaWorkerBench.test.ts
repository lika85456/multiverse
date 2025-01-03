import BucketChangesStorage from "../../ChangesStorage/BucketChangesStorage";
import type { StoredVectorChange } from "../../ChangesStorage/StoredVector";
import { Vector } from "../../core/Vector";
import S3SnapshotStorage from "../../SnapshotStorage/S3SnapshotStorage";
import LambdaWorker from "../LambdaWorker";

async function deployLambda(dimensions: number, vectorsStored: number) {
    const worker = new LambdaWorker({
        awsToken: undefined as any,
        lambdaName: "mv-bench-" + dimensions + "-" + vectorsStored,
        region: "eu-west-1"
    });

    const changesStorage = new BucketChangesStorage("mv-bench-" + dimensions + "-" + vectorsStored, {
        awsToken: undefined as any,
        maxObjectAge: 1000 * 60 * 60, // 1 hour
        region: "eu-west-1"
    });

    const snapshotBucket = new S3SnapshotStorage({
        awsToken: undefined as any,
        bucketName: "mv-bench-" + dimensions + "-" + vectorsStored,
        databaseId: {
            name: "mv-bench-" + dimensions + "-" + vectorsStored,
            region: "eu-west-1"
        },
    });

    await Promise.all([
        changesStorage.deploy(),
        snapshotBucket.deploy()
    ]);

    let vectors: StoredVectorChange[] = [];

    for (let i = 0; i < vectorsStored; i++) {
        vectors.push({
            action: "add",
            timestamp: Date.now(),
            vector: {
                label: i.toString(),
                vector: Vector.random(dimensions)
            }
        });

        if (vectors.length === 1000) {
            await changesStorage.add(vectors);
            vectors = [];
        }
    }

    await worker.deploy({
        changesStorage: changesStorage.getResourceName(),
        configuration: {
            dimensions,
            space: "l2"
        },
        databaseId: {
            name: "mv-bench-" + dimensions + "-" + vectorsStored,
            region: "eu-west-1"
        },
        partition: 0,
        snapshotBucket: snapshotBucket.getResourceName(),
        env: "development",
        enableLogs: true,
        ephemeralStorage: 10240,
        memorySize: 10240
    });

    await worker.loadLatestSnapshot();
}

async function removeLambda(dimensions: number, vectorsStored: number) {
    const worker = new LambdaWorker({
        awsToken: undefined as any,
        lambdaName: "mv-bench-" + dimensions + "-" + vectorsStored,
        region: "eu-west-1"
    });

    const changesStorage = new BucketChangesStorage("mv-bench-" + dimensions + "-" + vectorsStored, {
        awsToken: undefined as any,
        maxObjectAge: 1000 * 60 * 60, // 1 hour
        region: "eu-west-1"
    });

    const snapshotBucket = new S3SnapshotStorage({
        awsToken: undefined as any,
        bucketName: "mv-bench-" + dimensions + "-" + vectorsStored,
        databaseId: {
            name: "mv-bench-" + dimensions + "-" + vectorsStored,
            region: "eu-west-1"
        },
    });

    await Promise.all([
        changesStorage.destroy(),
        snapshotBucket.destroy()
    ]);

    await worker.destroy();
}

describe("LambdaWorkerBench", () => {
    const w1 = new LambdaWorker({
        awsToken: undefined as any,
        lambdaName: "mv-bench-w1",
        region: "eu-west-1"
    });

});