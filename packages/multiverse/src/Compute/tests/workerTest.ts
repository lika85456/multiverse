import type { DatabaseID, DatabaseConfiguration } from "../../core/DatabaseConfiguration";
import { Vector } from "../../core/Vector";
import type SnapshotStorage from "../../SnapshotStorage";
import type { Worker } from "../Worker";

function vectorIsClose(vector1: number[], vector2: number[]): boolean {
    const MAX_DIFF = 0.0001;

    return vector1.every((v1, i) => Math.abs(v1 - vector2[i]) < MAX_DIFF);
}

type InitializeWorkerFunction = (params: {
    databaseId: DatabaseID;
    config: DatabaseConfiguration;
}) => {
    worker: Worker;
    snapshotStorage: SnapshotStorage;
    config: DatabaseConfiguration;
    deploy: () => Promise<void>;
    destroy: () => Promise<void>;
};

export default function workerTest(initializeWorker: InitializeWorkerFunction) {

    describe("Empty snapshot storage", () => {

        const {
            worker, snapshotStorage, config, deploy, destroy
        } = initializeWorker({
            databaseId: {
                name: Math.random().toString(36).substring(7),
                region: "eu-west-1"
            },
            config: {
                dimensions: 3,
                space: "l2"
            }
        });

        beforeAll(async() => {
            await deploy();
        });

        afterAll(async() => {
            await destroy();
        });

        describe("Common", () => {
            describe(".query", () => {
                it("should return empty", async() => {
                    const result = await worker.query({
                        query: {
                            k: 10,
                            vector: Vector.random(config.dimensions),
                            sendVector: true
                        },
                        updates: [],
                    });

                    expect(result.result.result.length).toBe(0);
                    expect(result.state.lastUpdate).toBe(0);
                });

                it("should throw on bad K parameter", async() => {
                    await expect(worker.query({
                        query: {
                            k: -1,
                            vector: Vector.random(config.dimensions),
                            sendVector: true
                        },
                        updates: []
                    })).rejects.toThrow();
                });

                it("should throw on bad vector dimensions", async() => {
                    await expect(worker.query({
                        query: {
                            k: 10,
                            vector: Vector.random(config.dimensions + 1),
                            sendVector: true
                        },
                        updates: []
                    })).rejects.toThrow();
                });

                it("should return empty on k=0 but with vectors present", async() => {
                    const updateTime = Date.now();

                    await worker.update([
                        {
                            action: "add",
                            timestamp: updateTime,
                            vector: {
                                label: "test",
                                metadata: {},
                                vector: Vector.random(config.dimensions)
                            }
                        }
                    ]);

                    const result = await worker.query({
                        query: {
                            k: 0,
                            vector: Vector.random(config.dimensions),
                            sendVector: true
                        },
                        updates: []
                    });

                    expect(result.result.result.length).toBe(0);
                    expect(result.state.lastUpdate).toBe(updateTime);

                    await worker.update([
                        {
                            action: "remove",
                            timestamp: Date.now(),
                            label: "test"
                        }
                    ]);
                });

                it("should return the only vector present", async() => {
                    expect((await worker.count()).result.vectors).toBe(0);

                    const vector = Vector.random(config.dimensions);

                    await worker.update([
                        {
                            action: "add",
                            timestamp: Date.now(),
                            vector: {
                                label: "test",
                                metadata: {},
                                vector
                            }
                        }
                    ]);

                    const result = await worker.query({
                        query: {
                            k: 10,
                            vector,
                            sendVector: true
                        },
                        updates: []
                    });

                    expect(result.result.result.length).toBe(1);
                    expect(result.result.result[0].label).toBe("test");
                    // expect(result.result.result[0].vector).toEqual(vector);
                    expect(vectorIsClose(result.result.result[0].vector ?? [], vector)).toBe(true);

                    await worker.update([
                        {
                            action: "remove",
                            timestamp: Date.now(),
                            label: "test"
                        }
                    ]);
                });

                it("response should contain added vector in updates", async() => {
                    const result = await worker.query({
                        query: {
                            k: 10,
                            vector: Vector.random(config.dimensions),
                            sendVector: true
                        },
                        updates: [
                            {
                                action: "add",
                                timestamp: Date.now(),
                                vector: {
                                    label: "test",
                                    metadata: {},
                                    vector: Vector.random(config.dimensions)
                                }
                            }
                        ]
                    });

                    expect(result.result.result.length).toBe(1);
                });

                it("response should not contain removed vector in updates", async() => {
                    const result = await worker.query({
                        query: {
                            k: 10,
                            vector: Vector.random(config.dimensions),
                            sendVector: true
                        },
                        updates: [
                            {
                                action: "remove",
                                timestamp: Date.now(),
                                label: "test"
                            }
                        ]
                    });

                    expect(result.result.result.length).toBe(0);
                });
            });

            describe(".update", () => {
                it("should be empty at first", async() => {
                    const result = await worker.count();
                    expect(result.result.vectors).toBe(0);
                });

                it("should add vector and read it", async() => {
                    const vector = Vector.random(config.dimensions);

                    const updateTimestamp = Date.now();

                    await worker.update([
                        {
                            action: "add",
                            timestamp: updateTimestamp,
                            vector: {
                                label: "test",
                                metadata: {},
                                vector
                            }
                        }
                    ]);

                    const result = await worker.query({
                        query: {
                            k: 10,
                            vector,
                            sendVector: true
                        },
                        updates: []
                    });

                    expect(result.result.result.length).toBe(1);
                    expect(result.result.result[0].label).toBe("test");
                    // expect(result.result.result[0].vector).toEqual(vector);
                    expect(vectorIsClose(result.result.result[0].vector ?? [], vector)).toBe(true);

                    expect(result.state.lastUpdate).toBe(updateTimestamp);

                    await worker.update([
                        {
                            action: "remove",
                            timestamp: Date.now(),
                            label: "test"
                        }
                    ]);

                    expect((await worker.count()).result.vectors).toBe(0);
                });

                it("should do nothing on empty array", async() => {
                    expect((await worker.count()).result.vectors).toBe(0);

                    await worker.update([]);

                    expect((await worker.count()).result.vectors).toBe(0);
                });
            });

            describe(".state", () => {
                it("should return state", async() => {
                    const state = await worker.state();

                    expect(state.state.lastUpdate).toBeGreaterThanOrEqual(Date.now() - 1000);
                    expect(state.state.instanceId.length).toBeGreaterThan(0);
                });
            });

            describe("Snapshots", () => {
                it("should be empty", async() => {
                    expect((await worker.count()).result.vectors).toBe(0);
                });

                it("should not fail when trying to load latest snapshot", async() => {
                    await worker.loadLatestSnapshot();

                    expect(await snapshotStorage.loadLatest()).toBeUndefined();

                    expect((await worker.count()).result.vectors).toBe(0);
                });

                it("should save empty snapshot", async() => {
                    await worker.saveSnapshot();

                    expect(await snapshotStorage.loadLatest()).toBeDefined();
                });

                it("should add vector, load snapshot and read empty", async() => {
                    const vector = Vector.random(config.dimensions);

                    await worker.update([
                        {
                            action: "add",
                            timestamp: Date.now(),
                            vector: {
                                label: "test",
                                metadata: {},
                                vector
                            }
                        }
                    ]);

                    const result1 = await worker.query({
                        query: {
                            k: 10,
                            vector,
                            sendVector: true
                        },
                        updates: []
                    });
                    expect(result1.result.result.length).toBe(1);

                    await worker.loadLatestSnapshot();

                    const result2 = await worker.query({
                        query: {
                            k: 10,
                            vector,
                            sendVector: true
                        },
                        updates: []
                    });

                    expect(result2.result.result.length).toBe(0);
                });

                it("should save snapshot with vectors", async() => {
                    const vector = Vector.random(config.dimensions);

                    await worker.update([
                        {
                            action: "add",
                            timestamp: Date.now(),
                            vector: {
                                label: "test",
                                metadata: { meta: "data" },
                                vector
                            }
                        }
                    ]);

                    await worker.saveSnapshot();

                    // remove the vector
                    await worker.update([
                        {
                            action: "remove",
                            timestamp: Date.now(),
                            label: "test"
                        }
                    ]);

                    const snapshot = await snapshotStorage.loadLatest();
                    expect(snapshot).toBeDefined();

                    await worker.loadLatestSnapshot();

                    const result = await worker.query({
                        query: {
                            k: 10,
                            vector,
                            sendVector: true
                        },
                        updates: []
                    });

                    // update 1713801864077
                    // last   1713801880336

                    expect(result.result.result.length).toBe(1);
                    expect(result.result.result[0].label).toBe("test");
                    expect(result.result.result[0].metadata).toEqual({ meta: "data" });
                });
            });
        });
    });
};