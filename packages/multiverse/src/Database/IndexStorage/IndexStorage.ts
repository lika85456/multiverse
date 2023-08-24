import type Index from "../../Index";

export type IndexIdentifier = {
    name: string;
    timestamp: number;
    size: number;
};

export default abstract class IndexStorage {
    abstract saveIndex(index: Index, name: string): Promise<void>;
    abstract loadIndex(index: Index, name: IndexIdentifier): Promise<void>;

    abstract findLatestIndexSave(name: string): Promise<IndexIdentifier>;

    public nameFromIdentifier(identifier: IndexIdentifier): string {
        return identifier.name + "-" + identifier.timestamp + "-" + identifier.size;
    }

    abstract clean(name?: string): Promise<void>;
}