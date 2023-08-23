import type { StoredVector } from "../../Database/Vector";
import { Vector } from "../../Database/Vector";
import { Partition } from "../../Database/VectorDatabase";
import DynamoVectorStore from "./DynamoVectorStore";
import { readPartition, readPartitionAfter } from "../VectorStoreTest";

describe("<DynamoVectorStore>", () => {

    const store = new DynamoVectorStore({
        databaseName: "test-" + Math.random().toString(36).substring(7),
        dimensions: 3,
        region: "eu-central-1",
        tableName: "multiverse-collections-test"
    });

    afterAll(async() => {
        await store.deleteStore();
    });

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

    describe.skip("Edge cases", () => {
        it("should handle 1k vectors", async() => {
            const vectors = [];
            for (let i = 0; i < 1000; i++) {
                vectors.push({
                    id: Math.random(),
                    label: "test label " + i,
                    lastUpdate: 0,
                    vector: new Vector([i, i, i])
                });
            }

            await store.add(vectors);
        });

        it("should read all vectors in parallel", async() => {
            // read whole partition 5 times
            await Promise.all([
                readPartitionAfter(store, new Partition(0, 1), 0),
                readPartitionAfter(store, new Partition(0, 1), 0),
                readPartitionAfter(store, new Partition(0, 1), 0),
                readPartitionAfter(store, new Partition(0, 1), 0),
                readPartitionAfter(store, new Partition(0, 1), 0),
            ]);
        });
    });
});