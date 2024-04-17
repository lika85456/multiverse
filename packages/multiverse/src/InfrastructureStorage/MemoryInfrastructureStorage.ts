import type { Infrastructure } from ".";
import InfrastructureStorage from ".";

export default class MemoryInfrastructureStorage extends InfrastructureStorage {
    private storage: Map<string, Infrastructure>;
    constructor() {
        super();
        this.storage = new Map();
    }

    async set(dbName: string, infrastructure: Infrastructure) {
        this.storage.set(dbName, infrastructure);
    }

    async get(dbName: string) {
        return this.storage.get(dbName);
    }

    async remove(dbName: string) {
        this.storage.delete(dbName);
    }

    async list() {
        return Array.from(this.storage.values());
    }

    async deploy() {
        // no-op
    }

    async destroy() {
        this.storage.clear();
    }
}