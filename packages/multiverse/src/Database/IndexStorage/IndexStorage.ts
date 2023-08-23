import type Index from "../../Index";

export default interface IndexStorage {
    saveIndex(index: Index, name: string): Promise<void>;
    loadIndex(index: Index, name: string): Promise<void>;

    findLatestIndexSave(name: string): Promise<{
        name: string,
        timestamp: number,
        size: number
    }>;
}