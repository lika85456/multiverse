import type { StoredVectorChange } from "./StoredVector";

export default interface ChangesStorage {
    add(changes: StoredVectorChange[]): Promise<{unprocessedItems: string[]}>;
    changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown>;
    getAllChangesAfter(timestamp: number): Promise<StoredVectorChange[]>;
    clearBefore(timestamp: number): Promise<void>;

    deploy(): Promise<void>;
    destroy(): Promise<void>;

    getResourceName(): string;
}