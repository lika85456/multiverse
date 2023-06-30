import { S3 } from "./S3";

describe("<S3>", () => {
    describe("<S3 Factory>", () => {
        it("creates and destroys bucket", async() => {
            const s3 = new S3({ region: "eu-central-1" });
            const bucket = await s3.createBucket(Math.random().toString(36).slice(2));

            expect(bucket).toBeDefined();
            expect(await bucket.listObjects()).toHaveLength(0);

            await bucket.delete();
        });
    });
});