import DynamoChangesStorage from "./DynamoChangesStorage";
import MemoryChangesStorage from "./MemoryChangesStorage";
import type { StoredVectorChange } from "./StoredVector";

async function readWholeIterator<T>(iterator: AsyncGenerator<T, void, unknown>): Promise<T[]> {
    const result = [];

    for await (const item of iterator) {
        result.push(item);
    }

    return result;
}

describe.each([
    ["<MemoryChangesStorage>", new MemoryChangesStorage()],
    ["<DynamoChangesStorage>", new DynamoChangesStorage({
        tableName: "multiverse-test-changes-storage-" + Date.now(),
        databaseId: {
            name: "test",
            region: "eu-central-1"
        }
    })]
])("%s", (name, storage) => {

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

    it("should clear all changes", async() => {
        await storage.clearBefore(Date.now() + 10000);
        expect(await storage.count()).toBe(0);
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
    });

    it("should count", async() => {
        const count = await storage.count();
        expect(count).toBe(100);
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
});