import type { StoredVectorChange } from ".";
import { Vector } from "../Vector";
import { ENV } from "../env";
import DynamoChangesStorage from "./DynamoChangesStorage";
import log from "@multiverse/log";

const logger = log.getSubLogger({ name: "DynamoChangesStorage.Test" });

async function readWholeIterator<T>(iterator: AsyncGenerator<T, void, unknown>): Promise<T[]> {
    const result = [];

    for await (const item of iterator) {
        result.push(item);
    }

    return result;
}

describe("<DynamoChangesStorage>", () => {

    const tableName = ENV.CHANGES_TABLE;

    const storage = new DynamoChangesStorage({
        indexName: "test-index-" + Date.now(),
        owner: "test-owner",
        partition: 0,
        region: "eu-central-1",
        tableName: tableName
    });

    it("should add and read changes", async() => {
        const changes: StoredVectorChange[] = [
            {
                action: "add",
                timestamp: 1,
                vector: {
                    label: "test",
                    metadata: {},
                    vector: [1,2,3]
                }
            },
            {
                action: "add",
                timestamp: 2,
                vector: {
                    label: "test",
                    metadata: {},
                    vector: [4,5,6]
                }
            },
            {
                action: "remove",
                timestamp: 3,
                label: "test"
            }
        ];

        await storage.add(changes);

        const after0 = await readWholeIterator(storage.changesAfter(0));
        const after1 = await readWholeIterator(storage.changesAfter(1));
        const after2 = await readWholeIterator(storage.changesAfter(2));
        const after3 = await readWholeIterator(storage.changesAfter(3));

        expect(after0).toEqual(changes);
        expect(after1).toEqual(changes);
        expect(after2).toEqual(changes.slice(1));
        expect(after3).toEqual(changes.slice(2));

        logger.debug("Changes after 0", after0);
    });

});