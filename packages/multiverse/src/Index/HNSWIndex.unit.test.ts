import { Vector } from "../Database/Vector";
import HNSWIndex from "./HNSWIndex";

describe("<HNSWIndex>", () => {
    describe("Basic functions", () => {
        const index = new HNSWIndex({
            dimensions: 3,
            size: 100,
            spaceName: "l2"
        });

        it("should be empty", async() => {
            expect(index.physicalSize()).toBe(0);
        });

        it("should add vectors", async() => {
            await index.add([
                {
                    id: 1,
                    label: "test label 1",
                    lastUpdate: 0,
                    vector: new Vector([1, 2, 3])
                },
                {
                    id: 2,
                    label: "test label 2",
                    lastUpdate: 0,
                    vector: new Vector([4, 5, 6])
                }
            ]);

            expect(index.physicalSize()).toBe(2);
        });

        it("should remove vectors", async() => {
            await index.remove([1]);

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
            expect(result[0].id).toBe(2);
            expect(result[0].distance).toBe(14);
        });

        const path = "/tmp/" + Math.random().toString(36).substring(2, 10) + ".hnsw";
        it("should save", async() => {
            await index.saveIndex(path);
        });

        it("should load", async() => {
            const newIndex = new HNSWIndex({
                dimensions: 3,
                size: 100,
                spaceName: "l2"
            });

            await newIndex.loadIndex(path);

            expect(newIndex.physicalSize()).toBe(2);
        });
    });

    describe("Edge cases", () => {

        const index = new HNSWIndex({
            dimensions: 3,
            size: 100,
            spaceName: "l2"
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
                        id: i,
                        label: "test label " + i,
                        lastUpdate: 0,
                        vector: new Vector([i, i, i])
                    }
                ]);
            }
        });

        it("should work with multiple index instances", async() => {
            const instances = [
                new HNSWIndex({
                    dimensions: 3,
                    size: 100,
                    spaceName: "l2"
                }),
                new HNSWIndex({
                    dimensions: 3,
                    size: 100,
                    spaceName: "l2"
                }),
                new HNSWIndex({
                    dimensions: 3,
                    size: 100,
                    spaceName: "l2"
                }),
            ];

            for (let i = 0; i < 200; i++) {
                for (const instance of instances) {
                    await instance.add([
                        {
                            id: i,
                            label: "test label " + i,
                            lastUpdate: 0,
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
});