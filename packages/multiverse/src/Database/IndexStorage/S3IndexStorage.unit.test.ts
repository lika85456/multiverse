import type Index from "../../Index";
import HNSWIndex from "../../Index/HNSWIndex";
import { Vector } from "../Vector";
import { S3IndexStorage } from "./S3IndexStorage";

function randomVector(dimensions: number): Vector {
    return new Vector(Array.from({ length: dimensions }, () => Math.random()));
}

async function fillWithRandomVectors(index: Index, vectors: number) {
    const dimensions = await index.dimensions();

    const randomVectors = Array.from({ length: vectors }, () => ({
        id: Math.floor(Math.random() * 100000000),
        label: "test label-" + Math.random(),
        lastUpdate: 0,
        vector: randomVector(dimensions)
    }));

    return index.add(randomVectors);
}

describe("<S3IndexStorage>", () => {

    const indexStorage = new S3IndexStorage({
        bucket: "multiverse-test-collections",
        region: "eu-central-1"
    });

    // afterAll(async() => {
    //     await indexStorage.clean();
    // });

    describe("Basic functions", () => {
        const indexName = Math.random().toString();

        const indexToStore = new HNSWIndex({
            dimensions: 3,
            size: 200,
            spaceName: "l2"
        });

        beforeAll(async() => {
            await fillWithRandomVectors(indexToStore, 100);
        });

        it("should save", async() => {
            await indexStorage.saveIndex(indexToStore, indexName);
        });

        it("should load the latest", async() => {
            const newIndex = new HNSWIndex({
                dimensions: 3,
                size: 1,
                spaceName: "l2"
            });

            const indexIdentifier = await indexStorage.findLatestIndexSave(indexName);
            await indexStorage.loadIndex(newIndex, indexIdentifier);

            // should load the same amount of vectors
            expect(await newIndex.size()).toBe(await indexToStore.size());

            // should result the same on a knn query
            const query = new Vector(Array.from({ length: 3 }, () => Math.random()));
            const originalResult = await indexToStore.knn({
                vector: query,
                k: 5
            });
            const newResult = await newIndex.knn({
                vector: query,
                k: 5
            });

            expect(originalResult).toEqual(newResult);
        });
    });

    describe("Edge cases", () => {
        it.concurrent("should throw error if dimensions are not equal", async() => {
            const firstIndex = new HNSWIndex({
                dimensions: 3,
                size: 200,
                spaceName: "l2"
            });

            await fillWithRandomVectors(firstIndex, 100);

            const secondIndex = new HNSWIndex({
                dimensions: 4,
                size: 200,
                spaceName: "l2"
            });

            await indexStorage.saveIndex(firstIndex, "test_dimensions");

            await expect(indexStorage.loadIndex(secondIndex, {
                name: "test-dimensions",
                size: 100,
                timestamp: 0
            })).rejects.toThrowError();
        });

        it.concurrent("should load with existing vectors, but not keep them", async() => {
            const index = new HNSWIndex({
                dimensions: 3,
                size: 200,
                spaceName: "l2"
            });

            await index.add([{
                id: 69,
                label: "original",
                lastUpdate: 0,
                vector: new Vector([1, 2, 3])
            }]);

            const newIndex = new HNSWIndex({
                dimensions: 3,
                size: 200,
                spaceName: "l2"
            });

            await fillWithRandomVectors(newIndex, 100);

            // save new index
            await indexStorage.saveIndex(newIndex, "test");

            const latestIndexSnapshot = await indexStorage.findLatestIndexSave("test");
            // load new index into index
            await indexStorage.loadIndex(index, latestIndexSnapshot);

            // should not contain the original vector
            expect(await index.size()).toBe(100);

            const query = new Vector([1, 2, 3]);

            const result = await index.knn({
                vector: query,
                k: 1
            });

            expect(result[0].id).not.toBe(69);
        });

        it.skip("should upload big vector indexes", async() => {
            const index = new HNSWIndex({
                dimensions: 5000,
                size: 1000,
                spaceName: "l2"
            });

            await fillWithRandomVectors(index, 1000);

            await indexStorage.saveIndex(index, "big");
        });
    });
});