import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";
import { Vector } from "../core/Vector";
import HNSWIndex from "./HNSWIndex";
import { execSync } from "child_process";
import LocalIndex from "./LocalIndex";

const config: DatabaseConfiguration = {
    dimensions: 3,
    space: "l2",
};

describe.each([
    ["HNSWIndex", (config: DatabaseConfiguration) => new HNSWIndex(config)],
    ["LocalIndex", (config: DatabaseConfiguration) => new LocalIndex(config)]
])("%s", (name, indexFactory) => {

    describe("Basic functions", () => {
        const index = indexFactory(config);

        it("should be empty", async() => {
            expect(await index.count()).toBe(0);
        });

        it("should add vectors", async() => {
            await index.add([
                {
                    label: "test label 1",
                    vector: [1, 2, 3]
                },
                {
                    label: "test label 2",
                    vector: [4, 5, 6]
                }
            ]);

            expect(await index.count()).toBe(2);
        });

        it("should remove vectors", async() => {
            await index.remove(["test label 1"]);

            // size should be 1
            expect(await index.count()).toBe(1);
        });

        it("should query", async() => {
            const query = [3, 3, 3];
            const result = await index.knn({
                k: 10,
                vector: query,
                sendVector: true
            });

            expect(result.length).toBe(1);
            expect(result[0].label).toBe("test label 2");
            expect(result[0].distance).toBe(14);
        });
    });

    describe("Query with thousand vectors", () => {
        const index = indexFactory(config);

        beforeAll(async() => {
            const vectors = Array.from({ length: 1000 }, (_, i) => ({
                label: "test label " + i,
                vector: [i, i, i]
            }));

            await index.add(vectors);
        });

        it("should query", async() => {
            const query = [3, 3, 3];
            const result = await index.knn({
                k: 10,
                vector: query,
                sendVector: false
            });

            expect(result.length).toBe(10);
            expect(result[0].label).toBe("test label 3");
            expect(result[0].distance).toBe(0);
        });

    });
});

describe("Edge cases", () => {

    const index = new HNSWIndex(config);

    it("should fail on wrong query", async() => {
        // wrong amount of dimensions
        const query = [3, 3, 3, 3];
        await expect(index.knn({
            k: 10,
            vector: query
        })).rejects.toThrow();

        await expect(index.knn({
            k: -1,
            vector: [3, 3, 3]
        })).rejects.toThrow();
    });

    it("should resize automatically", async() => {
        for (let i = 0; i < 200; i++) {
            await index.add([
                {
                    label: "test label " + i,
                    vector: [i, i, i]
                }
            ]);
        }
    });

    it("should work with multiple index instances", async() => {
        const instances = [
            new HNSWIndex(config),
            new HNSWIndex(config),
            new HNSWIndex(config),
        ];

        for (let i = 0; i < 200; i++) {
            for (const instance of instances) {
                await instance.add([
                    {
                        label: "test label " + i,
                        vector: [i, i, i]
                    }
                ]);
            }
        }

        for (const instance of instances) {
            expect(await instance.count()).toBe(200);
        }
    });
});

describe("Saving & Loading", () => {
    describe("Small amount of vectors", () => {
        const index = new HNSWIndex({
            dimensions: 1536,
            space: "l2",
        });

        const path = "/tmp/multiverse-test-index";

        const firstVector = Vector.random(1536);
        const secondVector = Vector.random(1536);

        beforeAll(async() => {
            await index.add([
                {
                    label: "test label 1",
                    vector: firstVector,
                    metadata: { somsing: "smoozie" }
                },
                {
                    label: "test label 2",
                    vector: secondVector,
                }
            ]);
        });

        afterAll(async() => {
            execSync(`rm -rf ${path}`);
        });

        it("should save", async() => {
            await index.save(path);
        });

        it("should load", async() => {
            const newIndex = new HNSWIndex({
                dimensions: 1536,
                space: "l2",
            });

            await newIndex.load(path);

            expect(await newIndex.count()).toBe(2);
            expect(await newIndex.dimensions()).toBe(1536);

            const query = {
                k: 10,
                vector: firstVector,
            };

            const newQueryResult = await newIndex.knn(query);
            const oldQueryResult = await index.knn(query);

            expect(newQueryResult).toEqual(oldQueryResult);
        });
    });

    describe("Large amount of vectors", () => {
        const index = new HNSWIndex({
            dimensions: 1536,
            space: "l2",
        });

        const path = "/tmp/multiverse-test-index";

        const vectors = Array.from({ length: 2000 }, (_, i) => ({
            label: "test label " + i,
            vector: Vector.random(1536)
        }));

        beforeAll(async() => {
            await index.add(vectors);
        });

        afterAll(async() => {
            execSync(`rm -rf ${path}`);
        });

        it("should save", async() => {
            await index.save(path);
        });

        it("should load", async() => {
            const newIndex = new HNSWIndex({
                dimensions: 1536,
                space: "l2",
            });

            await newIndex.load(path);

            expect(await newIndex.count()).toBe(2000);
            expect(await newIndex.dimensions()).toBe(1536);

            const query = {
                k: 10,
                vector: vectors[0].vector,
            };

            const newQueryResult = await newIndex.knn(query);
            const oldQueryResult = await index.knn(query);

            expect(newQueryResult).toEqual(oldQueryResult);
        });
    });
});

describe("All indexes should give the same results", () => {
    const indexFactories = [
        (config: DatabaseConfiguration) => new HNSWIndex(config),
        (config: DatabaseConfiguration) => new LocalIndex(config)
    ];

    const vectors = Array.from({ length: 1000 }, (_, i) => ({
        label: "test label " + i,
        vector: Vector.random(config.dimensions)
    }));

    it("indexes should give the same results", async() => {
        const indexes = indexFactories.map(factory => factory(config));

        for (const index of indexes) {
            await index.add(vectors);
        }

        const queryVector = Vector.random(config.dimensions);

        const results = await Promise.all(indexes.map(index => index.knn({
            k: 10,
            vector: queryVector,
            sendVector: false
        })));

        for (let i = 1; i < results.length; i++) {
            for (let j = 0; j < results[i].length; j++) {
                // expect the label to be the exact same
                expect(results[i][j].label).toBe(results[0][j].label);

                // expect the distance to be close
                expect(results[i][j].distance).toBeCloseTo(results[0][j].distance, 3);
            }
        }
    });
});