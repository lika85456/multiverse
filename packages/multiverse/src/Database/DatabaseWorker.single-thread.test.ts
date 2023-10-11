import MemoryChangesStorage from "../ChangesStorage/MemoryChangesStorage";
import HNSWIndex from "../Index/HNSWIndex";
import LocalSnapshotStorage from "../SnapshotStorage/LocalSnapshotStorage";
import DatabaseWorker from "./DatabaseWorker";
import type { IndexConfiguration } from "../IndexConfiguration";
import { Vector } from "../Vector";
import type { DatabaseQuery } from "./DatabaseClient";

describe("<DatabaseWorker>", () => {

    const config = {
        dimensions: 1536,
        indexName: "test",
        owner: "test",
        region: "eu-central-1",
        space: "ip" as const
    } as IndexConfiguration;

    const changesStorage = new MemoryChangesStorage();

    const snapshotStorage = new LocalSnapshotStorage("test");

    const index = new HNSWIndex(config);

    const databaseWorker: DatabaseWorker = new DatabaseWorker({
        config,
        changesStorage,
        snapshotStorage,
        index,
        ephemeralLimit: 5000,
        memoryLimit: 5000
    });

    it("should have instanceId and report state", async() => {
        const state = await databaseWorker.state();

        expect(state.instanceId).toBeDefined();
        expect(state.lastUpdate).toBe(0);
        expect(state.memoryUsed).toBeGreaterThan(0);
    });

    it("query should be empty for empty worker", async() => {
        const result = await databaseWorker.query({
            query: {
                k: 10,
                vector: Vector.random(config.dimensions),
                metadataExpression: ""
            },
            updates: []
        });

        expect(result.result.result.length).toBe(0);
    });

    it("should wait on wake", async() => {
        const start = Date.now();

        await databaseWorker.wake(500);

        const end = Date.now();

        expect(end - start).toBeGreaterThanOrEqual(500);
    });

    it("should process updates", async() => {
        const query: DatabaseQuery = {
            query: {
                k: 10,
                vector: Vector.random(config.dimensions),
                metadataExpression: ""
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

        const result = await databaseWorker.query(query);

        expect(result.result.result.length).toBe(1);
        expect(result.result.result[0].label).toBe("test");
        expect(result.result.result[0].metadata).toEqual({ test: "test" });
    });

    it("should save snapshot", async() => {
        await databaseWorker.saveSnapshot();
    });

    it("should load snapshot", async() => {
        const anotherWorker: DatabaseWorker = new DatabaseWorker({
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
                metadataExpression: ""
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
                metadataExpression: ""
            },
            updates: []
        });

        expect(result2.result.result.length).toBe(1);
    });
});