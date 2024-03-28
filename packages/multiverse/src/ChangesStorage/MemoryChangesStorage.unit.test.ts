import type { StoredVectorChange } from ".";
import MemoryChangesStorage from "./MemoryChangesStorage";

async function readWholeIterator<T>(iterator: AsyncGenerator<T, void, unknown>): Promise<T[]> {
    const result = [];

    for await (const item of iterator) {
        result.push(item);
    }

    return result;
}

describe("<DynamoChangesStorage>", () => {

    const storage = new MemoryChangesStorage();

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
});