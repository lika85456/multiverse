import { Vector } from "../Vector";
import HNSWIndex from "./HNSWIndex";
import { execSync } from "child_process";

describe("<HNSWIndex>", () => {
    describe("Basic functions", () => {
        const index = new HNSWIndex({
            dimensions: 3,
            indexName: "test",
            space: "l2",
            owner: "test",
            region: "eu-central-1",
        });

        it("should be empty", async() => {
            expect(index.physicalSize()).toBe(0);
        });

        it("should add vectors", async() => {
            await index.add([
                {
                    label: "test label 1",
                    vector: new Vector([1, 2, 3])
                },
                {
                    label: "test label 2",
                    vector: new Vector([4, 5, 6])
                }
            ]);

            expect(index.physicalSize()).toBe(2);
        });

        it("should remove vectors", async() => {
            await index.remove(["test label 1"]);

            // physical size should remain the same
            expect(index.physicalSize()).toBe(2);
        });

        it("should query", async() => {
            const query = [3, 3, 3];
            const result = await index.knn({
                k: 10,
                vector: new Vector(query)
            });

            expect(result.length).toBe(1);
            expect(result[0].label).toBe("test label 2");
            expect(result[0].distance).toBe(14);
        });
    });

    describe("Query with thousand vectors", () => {
        const index = new HNSWIndex({
            dimensions: 3,
            indexName: "test",
            space: "l2",
            owner: "test",
            region: "eu-central-1",
        });

        beforeAll(async() => {
            const vectors = Array.from({ length: 1000 }, (_, i) => ({
                label: "test label " + i,
                vector: new Vector([i, i, i])
            }));

            await index.add(vectors);
        });

        it("should query", async() => {
            const query = [3, 3, 3];
            const result = await index.knn({
                k: 10,
                vector: new Vector(query)
            });

            expect(result.length).toBe(10);
            expect(result[0].label).toBe("test label 3");
            expect(result[0].distance).toBe(0);
        });

    });

    describe("Edge cases", () => {

        const index = new HNSWIndex({
            dimensions: 3,
            indexName: "test",
            space: "l2",
            owner: "test",
            region: "eu-central-1",
        });

        it("should fail on wrong query", async() => {
            // wrong amount of dimensions
            const query = [3, 3, 3, 3];
            await expect(index.knn({
                k: 10,
                vector: new Vector(query)
            })).rejects.toThrow();

            await expect(index.knn({
                k: -1,
                vector: new Vector([3, 3, 3])
            })).rejects.toThrow();
        });

        it("should resize automatically", async() => {
            for (let i = 0; i < 200; i++) {
                await index.add([
                    {
                        label: "test label " + i,
                        vector: new Vector([i, i, i])
                    }
                ]);
            }
        });

        it("should work with multiple index instances", async() => {
            const instances = [
                new HNSWIndex({
                    dimensions: 3,
                    indexName: "test",
                    space: "l2",
                    owner: "test",
                    region: "eu-central-1",
                }),
                new HNSWIndex({
                    dimensions: 3,
                    indexName: "test",
                    space: "l2",
                    owner: "test",
                    region: "eu-central-1",
                }),
                new HNSWIndex({
                    dimensions: 3,
                    indexName: "test",
                    space: "l2",
                    owner: "test",
                    region: "eu-central-1",
                })
            ];

            for (let i = 0; i < 200; i++) {
                for (const instance of instances) {
                    await instance.add([
                        {
                            label: "test label " + i,
                            vector: new Vector([i, i, i])
                        }
                    ]);
                }
            }

            for (const instance of instances) {
                expect(instance.physicalSize()).toBe(200);
            }
        });
    });

    describe("Saving & Loading", () => {
        const index = new HNSWIndex({
            dimensions: 3,
            indexName: "test",
            space: "l2",
            owner: "test",
            region: "eu-central-1",
        });

        const path = "/tmp/multiverse-test-index";

        beforeAll(async() => {
            await index.add([
                {
                    label: "test label 1",
                    vector: new Vector([1, 2, 3]),
                    metadata: { somsing: "smoozie" }
                },
                {
                    label: "test label 2",
                    vector: new Vector([4, 5, 6])
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
                dimensions: 3,
                indexName: "test",
                space: "l2",
                owner: "test",
                region: "eu-central-1",
            });

            await newIndex.load(path);

            expect(newIndex.physicalSize()).toBe(2);
            expect(await newIndex.dimensions()).toBe(3);

            const query = {
                k: 10,
                vector: new Vector([3, 3, 3])
            };

            const newQueryResult = await newIndex.knn(query);
            const oldQueryResult = await index.knn(query);

            expect(newQueryResult).toEqual(oldQueryResult);
        });
    });
});