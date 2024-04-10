import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";
import LambdaWorker from "./LambdaWorker";

/**
 * Fully deploys a lambda worker and tests it
 */
describe("<LambdaWorker>", () => {

    let worker: LambdaWorker;
    let changesStorage: DynamoChangesStorage;
    let snapshotStorage: S3SnapshotStorage;

    beforeAll(async() => {

        const changesTableName = "multiverse-changes-table-" + Math.random().toString(36).substring(7);
        const snapshotBucketName = "multiverse-snapshot-bucket-" + Math.random().toString(36).substring(7);

        const config = {
            dimensions: 3,
            name: "dbname",
            region: "eu-central-1" as const,
            space: "l2" as const,
        } as DatabaseConfiguration;

        worker = new LambdaWorker({
            lambdaName: "multiverse-lambda-worker-test",
            region: "eu-central-1"
        });

        changesStorage = new DynamoChangesStorage({
            ...config,
            tableName: changesTableName
        });

        snapshotStorage = new S3SnapshotStorage({
            ...config,
            bucketName: snapshotBucketName
        });

        await Promise.all([
            changesStorage.deploy(),
            snapshotStorage.deploy()
        ]);

        await worker.deploy({
            changesTable: changesTableName,
            env: "development",
            partition: 0,
            snapshotBucket: snapshotBucketName,
            configuration: config
        });
    });

    afterAll(async() => {
        await Promise.all([
            worker.destroy(),
            changesStorage.destroy(),
            snapshotStorage.destroy()
        ]);
    });

    it("should count", async() => {
        const { result } = await worker.count();
        expect(result).toEqual({
            vectors: 0,
            vectorDimensions: 3
        });
    });

    it("should query empty", async() => {
        const result = await worker.query({
            query: {
                k: 10,
                vector: [1, 2, 3],
                metadataExpression: "",
                sendVector: true
            },
        });

        expect(result.result.result.length).toBe(0);
    });

    it("should query a vector in given update", async() => {
        const result = await worker.query({
            query: {
                k: 10,
                vector: [1, 2, 3],
                metadataExpression: "",
                sendVector: true
            },
            updates: [
                {
                    action: "add",
                    timestamp: Date.now(),
                    vector: {
                        label: "test",
                        metadata: { name: "test" },
                        vector: [1, 2, 3]
                    }
                }
            ]
        });

        expect(result.result.result.length).toBe(1);
        expect(result.result.result[0].label).toBe("test");
        expect(result.result.result[0].metadata).toEqual({ name: "test" });
    });

    it("should save snapshot", async() => {
        await worker.saveSnapshot();

        expect(await snapshotStorage.loadLatest()).toBeDefined();
    });

    it("should load a snapshot", async() => {
        // should be empty
        const result = await worker.query({
            query: {
                k: 10,
                vector: [1, 2, 3],
                metadataExpression: "",
                sendVector: true
            },
            updates: [
                {
                    action: "add",
                    timestamp: Date.now(),
                    vector: {
                        label: "test",
                        metadata: { name: "test" },
                        vector: [1, 2, 3]
                    }
                }
            ]
        });
        expect(result.result.result.length).toBe(0);

        // load snapshot
        await worker.loadLatestSnapshot();

        // should have one item
        const result2 = await worker.query({
            query: {
                k: 10,
                vector: [1, 2, 3],
                metadataExpression: "",
                sendVector: true
            },
        });

        expect(result2.result.result.length).toBe(1);
    });

    it("should wait before responding, thus creating new instances", async() => {
        worker = new LambdaWorker({
            lambdaName: "multiverse-lambda-worker-test",
            region: "eu-central-1",
            waitTime: 1000
        });

        const results = await Promise.all([
            worker.query({
                query: {
                    k: 10,
                    vector: [1, 2, 3],
                    metadataExpression: "",
                    sendVector: true
                },
            }),
            worker.query({
                query: {
                    k: 10,
                    vector: [1, 2, 3],
                    metadataExpression: "",
                    sendVector: true
                },
            }),
            worker.query({
                query: {
                    k: 10,
                    vector: [1, 2, 3],
                    metadataExpression: "",
                    sendVector: true
                },
            }),
            worker.query({
                query: {
                    k: 10,
                    vector: [1, 2, 3],
                    metadataExpression: "",
                    sendVector: true
                },
            }),
        ]);

        // assert each of the results has different instanceId
        const instanceIds = results.map(r => r.state.instanceId);
        expect(new Set(instanceIds).size).toBe(results.length);
    });
});