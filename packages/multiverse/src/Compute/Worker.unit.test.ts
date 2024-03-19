import MemoryChangesStorage from "../ChangesStorage/MemoryChangesStorage";
import HNSWIndex from "../Index/HNSWIndex";
import LocalSnapshotStorage from "../SnapshotStorage/LocalSnapshotStorage";
import type { WorkerQuery } from "./Worker";
import Worker from "./Worker";
import { Vector } from "../core/Vector";
import type { DatabaseConfiguration } from "../DatabaseConfiguration";

describe("<Worker>", () => {

    const config = {
        dimensions: 1536,
        name: "test",
        region: "eu-central-1",
        space: "cosine"
    } as DatabaseConfiguration;

    const changesStorage = new MemoryChangesStorage();

    const snapshotStorage = new LocalSnapshotStorage("test");

    const index = new HNSWIndex(config);

    const worker: Worker = new Worker({
        config,
        changesStorage,
        snapshotStorage,
        index,
        ephemeralLimit: 5000,
        memoryLimit: 5000
    });

    it("should have instanceId and report state", async() => {
        const state = await worker.state();

        expect(state.instanceId).toBeDefined();
        expect(state.lastUpdate).toBe(0);
        expect(state.memoryUsed).toBeGreaterThan(0);
    });

    it("query should be empty for empty worker", async() => {
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

    it("should process updates", async() => {
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

    it("should save snapshot", async() => {
        await worker.saveSnapshot();
    });

    it("should load snapshot", async() => {
        const anotherWorker: Worker = new Worker({
            config,
            changesStorage,
            snapshotStorage,
            index: new HNSWIndex(config),
            ephemeralLimit: 5000,
            memoryLimit: 5000
        });

        // should be empty
        const result = await anotherWorker.query({
            query: {
                k: 10,
                vector: Vector.random(config.dimensions),
                metadataExpression: "",
                sendVector: true
            },
            updates: []
        });

        expect(result.result.result.length).toBe(0);

        // load snapshot
        await anotherWorker.loadLatestSnapshot();

        // should have one item
        const result2 = await anotherWorker.query({
            query: {
                k: 10,
                vector: Vector.random(config.dimensions),
                metadataExpression: "",
                sendVector: true
            },
            updates: []
        });

        expect(result2.result.result.length).toBe(1);
    });
});