import BuildBucket from "./BuildBucket";

describe("<BuildBucket>", () => {
    const bucketName = "mv-test-bucket-" + Math.random().toString(36).substring(7);

    const bucket = new BuildBucket(bucketName, {
        region: "eu-central-1",
        awsToken: undefined as unknown as any
    });

    afterAll(async() => {
        await bucket.destroy();
    });

    it("should deploy a bucket", async() => {
        await bucket.deploy();

        const exists = await bucket.exists();
        expect(exists).toBe(true);
    });

    it("should upload a build", async() => {
        await bucket.uploadLatestBuild(Buffer.from("test"));
    });

    it("should get the latest build key", async() => {
        const key = await bucket.getLatestBuildKey();

        if (!key) {
            throw new Error("Key not found");
        }

        expect(key.S3Bucket).toBe(bucketName);
        expect(key.S3Key).toBe("latest.zip");
    });
});