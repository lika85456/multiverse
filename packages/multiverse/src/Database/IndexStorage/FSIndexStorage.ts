import path from "path";
import type Index from "../../Index";
import IndexStorage from "./IndexStorage";
import type { IndexIdentifier } from "./IndexStorage";
import { readdir, unlink } from "fs/promises";
import { mkdirSync } from "fs";

const INDEX_STORAGE_PATH = "/tmp/index-storage/";

export class FSIndexStorage extends IndexStorage {

    constructor() {
        super();

        mkdirSync(INDEX_STORAGE_PATH, { recursive: true });
    }

    async findLatestIndexSave(name: string): Promise<IndexIdentifier> {
        const files = (await readdir(INDEX_STORAGE_PATH))
            .filter(file => file.startsWith(name))
            .map(file => {
                const [name, timestamp, size] = file.split("-");

                return {
                    name,
                    timestamp: parseInt(timestamp),
                    size: parseInt(size)
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        return files[0];
    }

    async saveIndex(index: Index, name: string): Promise<void> {
        if (name.includes("-")) {
            throw new Error("Index name cannot contain -");
        }

        const fileName = this.nameFromIdentifier({
            name,
            size: await index.size(),
            timestamp: Date.now()
        });

        await index.save(path.join(INDEX_STORAGE_PATH, fileName));
    }

    async loadIndex(index: Index, indexIdentifier: IndexIdentifier): Promise<void> {
        await index.load(path.join(INDEX_STORAGE_PATH, this.nameFromIdentifier(indexIdentifier)));
    }

    async clean(name?: string) {

        if (!name) {
            // delete all
            const files = await readdir(INDEX_STORAGE_PATH);

            for await (const file of files) {
                await unlink(path.join(INDEX_STORAGE_PATH, file));
            }

            return;
        }

        if (name.includes("-")) {
            throw new Error("Index name cannot contain -");
        }

        // delete all files that start with name
        const files = (await readdir(INDEX_STORAGE_PATH))
            .filter(file => file.startsWith(name));

        for await (const file of files) {
            unlink(path.join(INDEX_STORAGE_PATH, file));
        }
    }
}