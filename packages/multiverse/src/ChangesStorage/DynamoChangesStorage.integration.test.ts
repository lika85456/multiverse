/* eslint-disable @typescript-eslint/ban-ts-comment */
import DynamoChangesStorage from "./DynamoChangesStorage";
import type { StoredVectorChange } from "./StoredVector";

async function readWholeIterator<T>(iterator: AsyncGenerator<T, void, unknown>): Promise<T[]> {
    const result = [];

    for await (const item of iterator) {
        result.push(item);
    }

    return result;
}

describe("<DynamoChangesStorage>", () => {

    const storage = new DynamoChangesStorage({
        tableName: "multiverse-test-changes-storage-" + Date.now(),
        databaseId: {
            name: "test",
            region: "eu-central-1"
        }
    });

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

    it("should add and read changes", async() => {
        const changes: StoredVectorChange[] = [
            {
                action: "add",
                timestamp: Date.now(),
                vector: {
                    label: "test",
                    metadata: {},
                    vector: [1, 2, 3]
                }
            },
            {
                action: "add",
                timestamp: Date.now(),
                vector: {
                    label: "test",
                    metadata: {},
                    vector: [4, 5, 6]
                }
            },
            {
                action: "remove",
                timestamp: Date.now(),
                label: "test"
            }
        ];

        await storage.add(changes);

        const readChanges = await readWholeIterator(storage.changesAfter(0));
        expect(readChanges).toEqual(changes);
    });

    it("should add 100 changes and read 103", async() => {
        const changes: StoredVectorChange[] = Array.from({ length: 100 }, (_, i) => ({
            action: "add",
            timestamp: Date.now(),
            vector: {
                label: "test",
                metadata: {},
                vector: [i, i, i]
            }
        }));

        await storage.add(changes);

        const readChanges = await readWholeIterator(storage.changesAfter(0));
        expect(readChanges).toHaveLength(103);
    });

    it("should count 103", async() => {
        const count = await storage.count();
        expect(count).toBe(103);
    });

    it("should read correctly changesAfter", async() => {
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

        const readChanges = await readWholeIterator(storage.changesAfter(50));
        expect(readChanges).toHaveLength(153);
    });

    it("should read correctly getAllChangesAfter", async() => {

        const readChanges = await storage.getAllChangesAfter(50);
        expect(readChanges).toHaveLength(153);
    });

    it("should clear all", async() => {
        await storage.clearBefore(Date.now() + 10000);
        expect(await storage.count()).toBe(0);
    });

    it("should properly store and read vectors with floating point", async() => {
        const vector = {
            label: "test",
            metadata: {},
            vector: [
                Math.random(),
                Math.random(),
                Math.random()
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
});