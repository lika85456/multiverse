import { readFileSync, writeFileSync } from "fs";
import { Bucket } from "./S3";
import { S3 } from "./S3";

const buckets: Bucket[] = [];
const s3 = new S3({ region: "eu-central-1" });

async function createBucket(name?: string) {
    const bucket = await s3.createBucket(name ?? "multiverse-test-" + Math.random().toString(36).slice(2));
    buckets.push(bucket);
    return bucket;
}

describe.skip("<S3>", () => {
    describe("<S3 Factory>", () => {
        it("creates and lists buckets", async() => {
            const bucket = await createBucket();
            expect(bucket).toBeDefined();
            expect(await bucket.listObjects()).toHaveLength(0);

            const buckets = await s3.listBuckets();
            expect(buckets).toBeDefined();
            expect(buckets.some(bucket => bucket.name())).toBe(true);
        });
    });

    describe("<S3 Bucket>", () => {
        it("should upload and download object as a file", async() => {
            const bucket = await createBucket();

            writeFileSync("/tmp/test1Upload.txt", "Hello World!");

            await bucket.uploadObjectFile("testFile.txt", "/tmp/test1Upload.txt");

            const objects = await bucket.listObjects();
            expect(objects).toHaveLength(1);
            expect(objects[0]).toBe("testFile.txt");

            await bucket.downloadObjectFile("testFile.txt", "/tmp/test1Download.txt");

            const content = readFileSync("/tmp/test1Download.txt", "utf8");
            expect(content).toBe("Hello World!");

            await bucket.deleteObject("testFile.txt");

            const objects2 = await bucket.listObjects();
            expect(objects2).toHaveLength(0);
        });

        it("should upload and download objects as data", async() => {
            const bucket = await createBucket();

            await bucket.uploadObjectData("testFile.txt", "Hello World!");

            const objects = await bucket.listObjects();
            expect(objects).toHaveLength(1);
            expect(objects[0]).toBe("testFile.txt");

            const content = await bucket.downloadObjectData("testFile.txt");
            expect(new TextDecoder().decode(content)).toBe("Hello World!");

            await bucket.deleteObject("testFile.txt");

            const objects2 = await bucket.listObjects();
            expect(objects2).toHaveLength(0);
        });

        it("should persist data", async() => {
            const bucket = new Bucket({
                bucket: "multiverse-test-persist",
                region: "eu-central-1"
            });
            // const bucket = await s3.createBucket("multiverse-test-persist");
            // await bucket.uploadObjectData("testFile.txt", "Hello World!");

            const objects = await bucket.listObjects();
            expect(objects).toHaveLength(1);

            const content = await bucket.downloadObjectData("testFile.txt");
            expect(new TextDecoder().decode(content)).toBe("Hello World!");
        });
    });

    afterAll(async() => {
        await Promise.all(buckets.map(x => x.delete()));
    });
});