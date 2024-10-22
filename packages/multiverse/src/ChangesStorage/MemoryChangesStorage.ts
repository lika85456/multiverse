import type ChangesStorage from ".";
import type { StoredVectorChange } from "./StoredVector";

export default class MemoryChangesStorage implements ChangesStorage {

    private changes: StoredVectorChange[] = [];

    add(changes: StoredVectorChange[]): Promise<{unprocessedItems: string[]}> {
        this.changes.push(...changes);

        return Promise.resolve({ unprocessedItems: [] });
    }

    public async* changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown> {
        const changes = this.changes.filter(change => change.timestamp >= timestamp);

        for (const change of changes) {
            yield change;
        }

        return;
    }

    public async count(): Promise<number> {
        return this.changes.length;
    }

    public async clearBefore(timestamp: number): Promise<void> {
        this.changes = this.changes.filter(change => change.timestamp >= timestamp);
    }

    public async getAllChangesAfter(timestamp: number): Promise<StoredVectorChange[]> {
        return this.changes.filter(change => change.timestamp >= timestamp);
    }

    deploy(): Promise<void> {
        return Promise.resolve();
    }

    destroy(): Promise<void> {
        return Promise.resolve();
    }

    public getResourceName(): string {
        return "Memory";
    }
}