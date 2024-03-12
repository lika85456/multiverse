import {
    mkdir, readFile, writeFile
} from "fs/promises";
import LocalSnapshotStorage from "./LocalSnapshotStorage";

describe("LocalSnapshotStorage", () => {
    const snapshotStorage = new LocalSnapshotStorage("test");

    beforeAll(async() => {
        // create test file in /tmp/snapshots/test
        await mkdir("/tmp/snapshots/test", { recursive: true });
        await writeFile("/tmp/snapshots/test/1.snapshot", "test");
        await writeFile("/tmp/snapshots/testfile", "test");
    });

    it("should create", async() => {
        const snapshot = await snapshotStorage.create("/tmp/snapshots/testfile");

        expect(snapshot).toBeDefined();
        expect(snapshot.filePath.startsWith("/tmp/snapshots/test/")).toBe(true);
        expect(snapshot.timestamp).toBeGreaterThan(0);
        expect(snapshot.databaseName).toBe("test");
    });

    it("should load latest", async() => {
        const snapshot = await snapshotStorage.loadLatest();

        if (!snapshot) {
            throw new Error("Snapshot is undefined");
        }

        expect(snapshot).toBeDefined();
        expect(snapshot.filePath.startsWith("/tmp/snapshots/test/")).toBe(true);
        expect(snapshot.timestamp).toBeGreaterThan(1);
        expect(snapshot.databaseName).toBe("test");
        expect(readFile(snapshot.filePath, "utf-8")).resolves.toBe("test");
    });
});