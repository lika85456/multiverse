import type ChangesStorage from ".";
import type { StoredVectorChange } from ".";

export default class MemoryChangesStorage implements ChangesStorage {

    private changes: StoredVectorChange[] = [];

    add(changes: StoredVectorChange[]): Promise<void> {
        this.changes.push(...changes);

        return Promise.resolve();
    }

    public async* changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown> {
        const changes = this.changes.filter(change => change.timestamp >= timestamp);

        for (const change of changes) {
            yield change;
        }

        return;
    }

    deploy(): Promise<void> {
        return Promise.resolve();
    }

    destroy(): Promise<void> {
        return Promise.resolve();
    }
}