import {
    mkdir, readFile, writeFile
} from "fs/promises";
import S3SnapshotStorage, { S3SnapshotStorageDeployer } from "./S3SnapshotStorage";

describe("<S3SnapshotStorage>", () => {

    const bucketName = "snapshot-storage-test-" + Date.now();

    const deployer = new S3SnapshotStorageDeployer({
        bucketName,
        region: "eu-central-1"
    });

    const snapshotStorage = new S3SnapshotStorage({
        bucketName,
        region: "eu-central-1",
        name: "test"
    });

    beforeAll(async() => {
        await deployer.deploy();

        // prepare testfile
        await mkdir("/tmp/snapshots/test", { recursive: true });
        await writeFile("/tmp/snapshots/testfile", "test");
    });

    afterAll(async() => {
        await deployer.destroy();
    });

    it("should create", async() => {
        const snapshot = await snapshotStorage.create("/tmp/snapshots/testfile");

        expect(snapshot).toBeDefined();
        expect(snapshot.filePath).toBe("/tmp/snapshots/testfile");
        expect(snapshot.timestamp).toBeGreaterThan(0);
        expect(snapshot.databaseName).toBe("test");
        expect(readFile(snapshot.filePath, "utf-8")).resolves.toBe("test");
    });

    it("should load latest", async() => {
        const snapshot = await snapshotStorage.loadLatest();

        if (!snapshot) {
            throw new Error("Snapshot is undefined");
        }

        expect(snapshot).toBeDefined();
        expect(snapshot.filePath.startsWith("/tmp/s3-snapshots/")).toBe(true);
        expect(snapshot.timestamp).toBeGreaterThan(1);
        expect(snapshot.databaseName).toBe("test");
        expect(readFile(snapshot.filePath, "utf-8")).resolves.toBe("test");
    });
});