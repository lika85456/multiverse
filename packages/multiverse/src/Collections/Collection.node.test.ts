import type { Collection } from "./Collection";
import { Collections } from "./Collection";
import https from "https";
import {
    createReadStream, unlink, writeFileSync
} from "fs";

function put(url: string, data: any) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            url,
            {
                method: "PUT",
                headers: { "Content-Length": new Blob([data]).size }
            },
            (res) => {
                let responseBody = "";
                res.on("data", (chunk) => {
                    responseBody += chunk;
                });
                res.on("end", () => {
                    resolve(responseBody);
                });
            }
        );
        req.on("error", (err) => {
            reject(err);
        });
        req.write(data);
        req.end();
    });
}

describe("<Collections>", () => {

    const collections = new Collections({
        region: "eu-central-1",
        bucket: "multiverse-test-collections"
    });

    const testCollection = [
        {
            label: "1",
            vector: [1, 2]
        },
        {
            label: "2",
            vector: [3, 4]
        },
        {
            label: "3",
            vector: [5, 6]
        },
        {
            label: "4",
            vector: [7, 8]
        },
        {
            label: "5",
            vector: [9, 10]
        },
    ];

    const testCollectionText = testCollection.map(x => JSON.stringify(x)).join("\n");

    // in case of test failure, these objects are removed from the bucket afterAll
    const objectsToRemove: Collection[] = [];

    function createCollection() {
        const collectionName = "test" + Math.random();
        const collection = collections.collection({
            name: collectionName,
            dimensions: 2,
            type: "json"
        });

        objectsToRemove.push(collection);

        return collection;
    }

    describe("Expected behaviour", () => {

        it("should generate upload link", async() => {
            const link = await collections.collection({
                name: "test",
                dimensions: 2,
                type: "json"
            }).uploadLink();

            expect(link).toBeDefined();
            console.log(link);
        });

        it("should upload, read and delete a collection", async() => {

            const collection = createCollection();
            const link = await collection.uploadLink();
            await put(link, testCollectionText);

            // check that contents are there
            const resultCollection = [];

            for await (const item of collection) {
                resultCollection.push(item);
            }

            expect(resultCollection).toEqual(testCollection);

        });

        it("should upload with readable stream", async() => {
            const collection = createCollection();

            const filePath = "/tmp/" + Math.random();
            writeFileSync(filePath, testCollectionText);
            const readStream = createReadStream(filePath);

            await collection.upload(readStream);

            // check that contents are there
            const resultCollection = [];

            for await (const item of collection) {
                resultCollection.push(item);
            }

            unlink(filePath, () => { });

            expect(resultCollection).toEqual(testCollection);
        });
    });

    describe("Failures", () => {
        it("should throw on generating upload link if collection exists", async() => {

            const collection = createCollection();

            // first time ok
            const link = await collection.uploadLink();
            await put(link, testCollectionText);

            // second time not ok
            await expect(collection.uploadLink()).rejects.toThrow();
        });

        it.todo("should throw on second upload using the same link", async() => {
            // this one is probably not possible to test without extra lambda proxy
        });
    });

    afterAll(async() => {
        for (const object of objectsToRemove) {
            await collections.delete(object.name()).catch(e => e);
            object.cleanup();
        }
    });
});