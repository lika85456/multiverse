import log from "@multiverse/log";
import type ChangesStorage from "..";
import type { StoredVectorChange } from "../StoredVector";

async function readWholeIterator<T>(iterator: AsyncGenerator<T, void, unknown>): Promise<T[]> {
    const result = [];

    for await (const item of iterator) {
        result.push(item);
    }

    return result;
}

export default function changesStorageTest(storage: ChangesStorage) {

    beforeAll(async() => {
        await storage.deploy();
    });

    afterAll(async() => {
        await storage.destroy();
    });

    it("should read empty", async() => {
        const changes = await readWholeIterator(storage.changesAfter(0));
        expect(changes).toEqual([]);
    });

    it("should add changes", async() => {
        const changes: StoredVectorChange[] = [
            {
                action: "add",
                timestamp: 0,
                vector: {
                    label: "test",
                    metadata: {},
                    vector: [1, 2, 3]
                }
            },
            {
                action: "add",
                timestamp: 1,
                vector: {
                    label: "test",
                    metadata: {},
                    vector: [4, 5, 6]
                }
            },
            {
                action: "remove",
                timestamp: 2,
                label: "test"
            }
        ];

        await storage.add(changes);

        const readChanges = await readWholeIterator(storage.changesAfter(0));
        expect(readChanges).toEqual(changes);
    });

    it("should clear all changes", async() => {
        await storage.clearBefore(Date.now() + 10000);
        const changes = await readWholeIterator(storage.changesAfter(0));

        expect(changes).toEqual([]);
    });

    it("should add 100 changes", async() => {
        const changes: StoredVectorChange[] = Array.from({ length: 100 }, (_, i) => ({
            action: "add",
            timestamp: i,
            vector: {
                label: "test",
                metadata: {},
                vector: [i, i, i]
            }
        }));

        await storage.add(changes);

        const readChanges = await readWholeIterator(storage.changesAfter(0));
        expect(readChanges).toHaveLength(100);

        // also compare the vectors
        for (let i = 0; i < 100; i++) {
            const change = readChanges[i];
            if (change.action !== "add") throw new Error("Expected add action");
            expect(change.vector.vector).toEqual([i, i, i]);
        }
    });

    it("should count", async() => {
        const changes = await storage.getAllChangesAfter(0);

        expect(changes).toHaveLength(100);
    });

    it("should read correctly changesAfter", async() => {
        const readChanges = await readWholeIterator(storage.changesAfter(50));
        expect(readChanges).toHaveLength(50);
    });

    it("should read correctly getAllChangesAfter", async() => {
        const readChanges = await storage.getAllChangesAfter(50);
        expect(readChanges).toHaveLength(50);
    });

    it("should properly store and read vectors with floating point", async() => {
        await storage.clearBefore(Date.now() + 10000);

        const vector = {
            label: "test",
            metadata: {},
            vector: [
                Math.random() * 100000,
                Math.random() * 100000,
                Math.random() * 100000
            ]
        };

        await storage.add([{
            action: "add",
            timestamp: Date.now(),
            vector
        }]);

        const readChanges = await readWholeIterator(storage.changesAfter(0));

        expect(readChanges).toEqual([{
            action: "add",
            timestamp: expect.any(Number),
            vector: expect.any(Object)
        }]);

        // @ts-ignore
        expect(readChanges[0].vector.vector).toEqual(vector.vector.map((v) => expect.closeTo(v)));
    });

    it("should handle 1000x1536 vectors", async() => {
        await storage.clearBefore(Date.now() + 10000);
        const length = 1000;

        const vectors = Array.from({ length }, (_, i) => ({
            label: i + "",
            metadata: {},
            vector: Array.from({ length }, (_, j) => j + i)
        }));

        const changesToAdd = vectors.map(vector => ({
            action: "add" as const,
            timestamp: Date.now(),
            vector
        }));

        const quarter = changesToAdd.slice(0, length / 4);
        const otherQuarter = changesToAdd.slice(length / 4, length / 2);
        log.info("Adding first half of changes");
        await Promise.all([
            storage.add(quarter),
            storage.add(otherQuarter)
        ]);

        // add the rest of the changes
        log.info("Adding second half of changes");
        await storage.add(changesToAdd.slice(length / 2));

        log.info("Reading changes");
        const readChanges = await storage.getAllChangesAfter(0);
        expect(readChanges).toHaveLength(length);
        log.info("Checking vectors");

        // expect there are the same vectors (maybe in different order)
        const readVectors = readChanges.map(change => change.action === "add" && change.vector.vector);
        expect(readVectors).toEqual(expect.arrayContaining(vectors.map(v => v.vector)));
    });
}