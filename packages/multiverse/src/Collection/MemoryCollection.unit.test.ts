import type { Readable } from "stream";
import type { Collection, LabeledVector } from "./Collection";
import MemoryCollection from "./MemoryCollection";

async function readAll(collection: Collection): Promise<LabeledVector[]> {
    const stream: Readable = await collection.readStream();
    const vectors: any[] = [];

    for await (const vector of stream) {
        vectors.push(vector);
    }

    return vectors;
}

describe("<MemoryCollection>", () => {

    const collectionData = () => [
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

    it("should read", async() => {
        const collection = new MemoryCollection({
            vectors: collectionData(),
            dimensions: 3
        });

        const vectors = await readAll(collection);

        expect(vectors).toEqual(collectionData());
    });

    it("should add", async() => {
        const collection = new MemoryCollection({
            vectors: collectionData(),
            dimensions: 3
        });

        const newVector = {
            label: 4,
            vector: [10, 11, 12]
        };

        await collection.add([newVector]);

        const vectors = await readAll(collection);

        expect(vectors).toEqual([...collectionData(), newVector]);
    });

    it("should remove", async() => {
        const collection = new MemoryCollection({
            vectors: collectionData(),
            dimensions: 3
        });

        await collection.remove([2]);

        const vectors = await readAll(collection);

        expect(vectors).toEqual(collectionData().filter(v => v.label !== 2));
    });
});