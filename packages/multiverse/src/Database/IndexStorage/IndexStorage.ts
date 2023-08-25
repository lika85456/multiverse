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
        return identifier.name + "-" + identifier.size + "-" + identifier.timestamp;
    }

    public identifierFromName(name: string): IndexIdentifier {
        // name can contain dashes, so we need to split by dashes and then join the first parts

        const parts = name.split("-");
        const timestamp = parseInt(parts.pop() as string);
        const size = parseInt(parts.pop() as string);
        const nameWithoutSizeAndTimestamp = parts.join("-");

        return {
            name: nameWithoutSizeAndTimestamp,
            size,
            timestamp
        };
    }

    abstract clean(name?: string): Promise<void>;
}