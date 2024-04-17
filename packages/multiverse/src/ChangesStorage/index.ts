import type { StoredVectorChange } from "./StoredVector";

export default interface ChangesStorage {
    add(changes: StoredVectorChange[]): Promise<void>;
    changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown>;
    getAllChangesAfter(timestamp: number): Promise<StoredVectorChange[]>;

    deploy(): Promise<void>;
    destroy(): Promise<void>;
}