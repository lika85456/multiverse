import type { NewVector } from "../Vector";

// updates in these types need to be reflected in the changes storage implementations
type StoredVectorChangeBase = {
    action: "add" | "remove";
    timestamp: number;
};

type StoredVectorAddChange = StoredVectorChangeBase & {
    action: "add";
    vector: NewVector;
};

type StoredVectorRemoveChange = StoredVectorChangeBase & {
    action: "remove";
    label: string;
};

export type StoredVectorChange = StoredVectorAddChange | StoredVectorRemoveChange;

export default interface ChangesStorage {
    add(changes: StoredVectorChange[]): Promise<void>;
    changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown>;
}