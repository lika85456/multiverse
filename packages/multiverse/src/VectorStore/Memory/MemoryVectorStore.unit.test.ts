import type { StoredVector } from "../../Database/Vector";
import { Partition, Vector } from "../../Database/Vector";
import { readPartition, readPartitionAfter } from "../VectorStoreTest";
import MemoryVectorStore from "./MemoryVectorStore";

describe("<MemoryVectorStore>", () => {

    const store = new MemoryVectorStore();

    describe("Basic functionality", () => {
        it("should be empty", async() => {
            const vectors = store.partition(new Partition(0, 1));

            for await (const _vector of vectors) {
                throw new Error("Should be empty");
            }
        });

        it("should add vectors", async() => {
            await store.add([
                {
                    id: Math.random(),
                    label: "test label 1",
                    lastUpdate: 0,
                    vector: new Vector([1, 2, 3])
                },
                {
                    id: Math.random(),
                    label: "test label 2",
                    lastUpdate: 0,
                    vector: new Vector([4, 5, 6])
                }
            ]);

            const vectors = await readPartition(store, new Partition(0, 1));
            expect(vectors.length).toBe(2);
        });

        let vector: StoredVector;
        it("should find vectors by id", async() => {
            const result = await store.getByLabel("test label 1");

            if (!result) {
                throw new Error("Vector not found");
            }

            vector = result;
            expect(result.vector.toArray()).toEqual([1, 2, 3]);
        });

        it("should remove vectors", async() => {
            await store.remove([vector.id]);

            const vectors = await readPartition(store, new Partition(0, 1));
            expect(vectors.length).toBe(1);
            expect(vectors[0].vector.toArray()).toEqual([4, 5, 6]);
            expect(vectors[0].label).toBe("test label 2");
        });

        it("should get by label", async() => {
            const vector = await store.getByLabel("test label 2");
            expect(vector!.vector.toArray()).toEqual([4, 5, 6]);
        });
    });

    describe("Partitioning", () => {
        const store = new MemoryVectorStore();

        beforeAll(async() => {
            // add 100 vectors
            await store.add(Array.from({ length: 100 }, (_, i) => ({
                id: i / 100,
                label: i.toString(),
                lastUpdate: i,
                vector: new Vector([i])
            })));
        });

        it.each([
            [10],
            [20],
            [3],
            [7],
            [1]
        ])("should return every vector in %i partitions", async(partitionsCount) => {
            const partitions = Array.from({ length: partitionsCount }, (_, i) => new Partition(i, partitionsCount));
            const vectors = await Promise.all(partitions.map(partition => readPartition(store, partition)));

            // find duplicities
            const allVectors = vectors.flat();
            const uniqueVectors = new Set(allVectors);
            expect(allVectors.length).toBe(uniqueVectors.size);

            expect(vectors.flat().length).toBe(100);
        });

        it.each([
            [0],
            [10],
            [50],
            [100]
        ])("should return vectors after %i ms updates", async(updateTimestamp) => {
            const vectorsLength = 100 - updateTimestamp;

            const vectors = await readPartitionAfter(store, new Partition(0, 1), updateTimestamp);
            expect(vectors.length).toBe(vectorsLength);
        });

        it.each([
            [0, 13],
            [10, 3],
            [50, 1],
            [100, 7]
        ])("should return vectors after %i ms updates and %i partitions", async(updateTimestamp, partitionsCount) => {
            const vectorsLength = 100 - updateTimestamp;

            const partitions = Array.from({ length: partitionsCount }, (_, i) => new Partition(i, partitionsCount));
            const vectors = await Promise.all(partitions.map(partition => readPartitionAfter(store, partition, updateTimestamp)));

            expect(vectors.flat().length).toBe(vectorsLength);
        });
    });
});