import type { Readable } from "stream";
import type { Collection, LabeledVector } from "./Collection";
import { DynamoCollection } from "./DynamoCollection";

async function readAll(collection: Collection): Promise<LabeledVector[]> {
    const stream: Readable = await collection.readStream();
    const vectors: any[] = [];

    for await (const vector of stream) {
        vectors.push(vector);
    }

    return vectors;
}

describe("<DynamoCollection>", () => {

    const collectionData = () => [
        {
            label: "a",
            vector: [1, 2, 3]
        },
        {
            label: "b",
            vector: [4, 5, 6]
        },
        {
            label: "c",
            vector: [7, 8, 9]
        },
    ];

    const collection = new DynamoCollection({
        region: "eu-central-1",
        table: ""
    });

    beforeEach(async() => {
        const vectors = await readAll(collection);

        const uniqueLabels = new Set(vectors.map(({ label }) => label));

        if (uniqueLabels.size > 0) {
            await collection.remove(Array.from(uniqueLabels));
        }
    });

    afterEach(async() => {
        const vectors = await readAll(collection);

        const uniqueLabels = new Set(vectors.map(({ label }) => label));

        if (uniqueLabels.size > 0) {
            await collection.remove(Array.from(uniqueLabels));
        }
    });

    it("should read empty", async() => {
        const vectors = await readAll(collection);

        expect(vectors).toEqual([]);
    });

    it("should add", async() => {
        await collection.add(collectionData());

        const vectors = await readAll(collection);

        // expect(vectors).toEqual(collectionData());
        // assert same items
        expect(vectors).toEqual(expect.arrayContaining(collectionData()));
    });

    it("should remove", async() => {
        await collection.add(collectionData());

        await collection.remove(["b"]);

        const vectors = await readAll(collection);

        // expect(vectors).toEqual(collectionData().filter(({ label }) => label !== "b"));
        // assert same items
        expect(vectors).toEqual(expect.arrayContaining(collectionData().filter(({ label }) => label !== "b")));
    });
});