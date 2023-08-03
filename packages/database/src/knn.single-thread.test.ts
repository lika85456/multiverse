import type { DynamicCollection } from "@multiverse/core/src/Collection/Collection";
import MemoryCollection from "@multiverse/core/src/Collection/MemoryCollection";
import KNN from "./knn";

const DEFAULT_VECTORS = [
    {
        label: 1,
        vector: [1, 2, 3]
    },
    {
        label: 2,
        vector: [4, 5, 6]
    },
    {
        label: 3,
        vector: [7, 8, 9]
    },
];

describe("<KNN>", () => {
    let collection: DynamicCollection;
    let knn: KNN;

    beforeEach(() => {
        collection = new MemoryCollection({
            dimensions: 3,
            vectors: DEFAULT_VECTORS
        });

        knn = new KNN({ collection, });
    });

    it("should search", async() => {
        const query = [1, 2, 3];

        const result = await knn.search(query, 3);

        expect(result.distances).toEqual([0, 27, 108]);
        expect(result.neighbors).toEqual([1, 2, 3]);
    });

    it("should handle updates", async() => {
        await collection.add([{
            label: 4,
            vector: [1, 2, 3]
        }]);

        await collection.remove([1, 2]);

        const query = [1, 2, 3];

        const changes = await collection.changesAfter(0);
        await knn.update(changes, 0);
        const result = await knn.search(query, 3);

        expect(result.distances).toEqual([0, 108]);
        expect(result.neighbors).toEqual([4, 3]);
    });
});