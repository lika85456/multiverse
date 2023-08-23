import type Index from "../../Index";
import type IndexStorage from "./IndexStorage";

export class FSIndexStorage implements IndexStorage {
    findLatestIndexSave(name: string): Promise<{ name: string; timestamp: number; size: number; }> {
        throw new Error("Method not implemented.");
    }

    async saveIndex(index: Index, name: string): Promise<void> {
        await index.save(name);
    }

    async loadIndex(index: Index, name: string): Promise<void> {
        await index.load(name);
    }

}