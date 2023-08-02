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

    const collection = new DynamoCollection({
        databaseName: "dev",
        mainRegion: "eu-central-1",
        secondaryRegions: []
    }, {
        collectionName: "collection",
        dimensions: 3,
        type: "dynamic"
    });

    beforeEach(async() => {
        const vectors = await readAll(collection);

        const uniqueLabels = new Set(vectors.map(({ label }) => label));

        if (uniqueLabels.size > 0) {
            await collection.remove(Array.from(uniqueLabels));
        }
        await collection.cleanupRemoved();
    });

    afterEach(async() => {
        const vectors = await readAll(collection);

        const uniqueLabels = new Set(vectors.map(({ label }) => label));

        if (uniqueLabels.size > 0) {
            await collection.remove(Array.from(uniqueLabels));
        }
        await collection.cleanupRemoved();
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

        await collection.remove([2]);

        const vectors = await readAll(collection);

        // expect(vectors).toEqual(collectionData().filter(({ label }) => label !== "b"));
        // assert same items
        expect(vectors).toEqual(expect.arrayContaining(collectionData().filter(({ label }) => label !== 2)));
    });

    it("should calculate changes after timestamp", async() => {
        await collection.add(collectionData(), 1);
        await collection.add([{
            label: 4,
            vector: [1, 2, 3]
        }], 2);
        await collection.add([{
            label: 5,
            vector: [1, 2, 3]
        }], 3);
        await collection.remove([2, 4]);

        const vectors = await collection.changesAfter(1);
        expect(vectors).toEqual(expect.arrayContaining([
            {
                label: 4,
                vector: [1, 2, 3],
                deactivated: true
            },
            {
                label: 5,
                vector: [1, 2, 3]
            },
            {
                label: 2,
                vector: [4, 5, 6],
                deactivated: true
            }
        ]));
    });

    it.todo("should deactivate removed vectors");
    it.todo("should cleanup deactivated vectors");
    it.todo("should not break on adding a duplicate vector");
    it.todo("should not break on adding a previously deactivated/removed vector");

});