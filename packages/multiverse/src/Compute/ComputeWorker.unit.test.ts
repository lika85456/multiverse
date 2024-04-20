import MemoryChangesStorage from "../ChangesStorage/MemoryChangesStorage";
import HNSWIndex from "../Index/HNSWIndex";
import LocalSnapshotStorage from "../SnapshotStorage/LocalSnapshotStorage";
import type { WorkerQuery } from "./Worker";
import { Vector } from "../core/Vector";
import ComputeWorker from "./ComputeWorker";
import type { StoredVectorChange } from "../ChangesStorage/StoredVector";
import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";

describe("<ComputeWorker>", () => {

    const config: DatabaseConfiguration = {
        dimensions: 1536,
        space: "ip"
    };

    describe("Stateless", () => {

        let changesStorage: MemoryChangesStorage;
        let snapshotStorage: LocalSnapshotStorage;
        let index: HNSWIndex;
        let worker: ComputeWorker;

        beforeEach(async() => {
            changesStorage = new MemoryChangesStorage();
            snapshotStorage = new LocalSnapshotStorage(Math.random().toString(36).substring(7));
            index = new HNSWIndex(config);
            worker = new ComputeWorker({
                changesStorage,
                partitionIndex: 0,
                snapshotStorage,
                index,
                ephemeralLimit: 5000,
                memoryLimit: 5000
            });
        });

        it("should have instanceId and report state", async() => {
            const { state } = await worker.state();

            expect(state.instanceId).toBeDefined();
            expect(state.lastUpdate).toBe(0);
            expect(state.memoryUsed).toBeGreaterThan(0);
        });

        it("query should be empty", async() => {
            const result = await worker.query({
                query: {
                    k: 10,
                    vector: Vector.random(config.dimensions),
                    metadataExpression: "",
                    sendVector: true
                },
                updates: []
            });

            expect(result.result.result.length).toBe(0);
        });

        it("should wait on wake", async() => {
            const start = Date.now();

            await worker.wake(500);

            const end = Date.now();

            expect(end - start).toBeGreaterThanOrEqual(500);
        });

        it("should process updates and incorporate them into the response", async() => {
            const query: WorkerQuery = {
                query: {
                    k: 10,
                    vector: Vector.random(config.dimensions),
                    metadataExpression: "",
                    sendVector: true
                },
                updates: [
                    {
                        action: "add",
                        timestamp: 5,
                        vector: {
                            label: "test",
                            vector: Vector.random(config.dimensions),
                            metadata: { test: "test" }
                        },
                    }
                ]
            };

            const result = await worker.query(query);

            expect(result.result.result.length).toBe(1);
            expect(result.result.result[0].label).toBe("test");
            expect(result.result.result[0].metadata).toEqual({ test: "test" });
        });

        it("should not mess up when updates have the same timestamp", async() => {
            const now = Date.now();
            const firstVector = Vector.random(config.dimensions);

            const updates: StoredVectorChange[] = [
                {
                    action: "add",
                    timestamp: now,
                    vector: {
                        label: "test",
                        vector: firstVector,
                        metadata: { test: "test" }
                    },
                },
                {
                    action: "remove",
                    timestamp: now,
                    label: "test"
                },
                {
                    action: "add",
                    timestamp: now,
                    vector: {
                        label: "test",
                        vector: Vector.random(config.dimensions),
                        metadata: { test: "test" }
                    },
                }
            ];

            const result = await worker.query({
                query: {
                    k: 10,
                    vector: Vector.random(config.dimensions),
                    metadataExpression: "",
                    sendVector: true
                },
                updates
            });

            const result2 = await worker.query({
                query: {
                    k: 10,
                    vector: firstVector,
                    metadataExpression: "",
                    sendVector: true
                },
                updates
            });

            expect(result.result.result.length).toBe(1);
            expect(result2.result.result.length).toBe(1);

            expect(result2.result.result[0].vector).not.toEqual(firstVector);
        });
    });

    describe("Snapshot", () => {

        let changesStorage: MemoryChangesStorage;
        let snapshotStorage: LocalSnapshotStorage;
        let index: HNSWIndex;
        let worker: ComputeWorker;

        beforeAll(async() => {
            changesStorage = new MemoryChangesStorage();
            snapshotStorage = new LocalSnapshotStorage(Math.random().toString(36).substring(7));
            index = new HNSWIndex(config);
            worker = new ComputeWorker({
                changesStorage,
                partitionIndex: 0,
                snapshotStorage,
                index,
                ephemeralLimit: 5000,
                memoryLimit: 5000
            });
        });

        const vectorSaved = Vector.random(config.dimensions);

        it("should not have any snapshot saved", async() => {
            const snapshot = await snapshotStorage.loadLatest();
            expect(snapshot).toBeUndefined();
        });

        it("should save snapshot with some vectors", async() => {
            await worker.update([
                {
                    action: "add",
                    timestamp: Date.now(),
                    vector: {
                        label: "test",
                        vector: vectorSaved,
                        metadata: { vectorSaved: JSON.stringify(vectorSaved) }
                    },
                }
            ]);

            await worker.saveSnapshot();

            expect(await snapshotStorage.loadLatest()).toBeDefined();
        });

        it("should load the snapshot in another worker automagically", async() => {
            expect(await snapshotStorage.loadLatest()).toBeDefined();

            const anotherWorker = new ComputeWorker({
                changesStorage,
                partitionIndex: 0,
                snapshotStorage,
                index: new HNSWIndex(config),
                ephemeralLimit: 5000,
                memoryLimit: 5000
            });

            // should NOT be empty
            const result = await anotherWorker.query({
                query: {
                    k: 10,
                    vector: Vector.random(config.dimensions),
                    metadataExpression: "",
                    sendVector: true
                },
                updates: []
            });

            expect(result.result.result.length).toBe(1);
            expect(result.result.result[0].label).toBe("test");
            expect(result.result.result[0].metadata.vectorSaved).toBe(JSON.stringify(vectorSaved));

            // the resulting vector can have different values due to the nature of the index
            // compare with precision of 0.0001%
            if (!result.result.result[0].vector)
                throw new Error("vector is undefined");

            expect(result.result.result[0].vector
                .map((v, i) => Math.abs(v - vectorSaved[i]) / vectorSaved[i])
                .reduce((a, b) => a + b, 0))
                .toBeLessThan(0.0001);
        });
    });
});