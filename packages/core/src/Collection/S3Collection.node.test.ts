import { unlink } from "fs";
import { ENV } from "../env";
import type { Collection, LabeledVector } from "./Collection";
import { S3Collection } from "./S3Collection";
import { Readable } from "stream";

const RANDOM_TEST_ID = Math.random().toString(36).substring(7);

async function readAll(collection: Collection): Promise<LabeledVector[]> {
    const stream: Readable = await collection.readStream();
    const vectors: any[] = [];

    for await (const vector of stream) {
        vectors.push(vector);
    }

    return vectors;
}

describe("<S3Collection>", () => {

    const collectionData = [
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

    let collection: S3Collection;

    beforeAll(async() => {
        collection = new S3Collection({
            region: "eu-central-1",
            bucket: ENV.TEST_COLLECTIONS_BUCKET,
            name: `test-${process.env.NODE_ENV}-${RANDOM_TEST_ID}`,
            dimensions: 3,
            vectors: collectionData.length
        });

        await collection.upload(new Readable({
            // read one stringified vector at a time
            objectMode: true,
            read() {
                const vector = collectionData.shift();

                if (vector) {
                    this.push(JSON.stringify(vector) + "\n");
                } else {
                    this.push(null);
                }
            }
        }));
    }, 30000);

    afterAll(async() => {
        await collection.delete();

        unlink("/tmp/collection.dat", () => {});
    }, 30000);

    it("should read", async() => {
        const vectors = await readAll(collection);
        expect(vectors).toEqual(collectionData);
    });
});