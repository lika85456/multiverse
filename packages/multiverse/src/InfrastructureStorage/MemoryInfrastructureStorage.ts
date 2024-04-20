/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Infrastructure } from ".";
import InfrastructureStorage from ".";

export default class MemoryInfrastructureStorage extends InfrastructureStorage {

    private storage: Map<string, Infrastructure>;
    constructor() {
        super();
        this.storage = new Map();
    }

    public async setProperty<T extends keyof Infrastructure>(dbName: string, property: keyof Infrastructure, value: Infrastructure[T]) {
        const infrastructure = await this.get(dbName);
        if (!infrastructure) {
            throw new Error(`Database ${dbName} not found`);
        }

        // @ts-ignore
        infrastructure[property] = value;

        await this.set(dbName, infrastructure);
    }

    public async set(dbName: string, infrastructure: Infrastructure) {
        this.storage.set(dbName, infrastructure);
    }

    public async get(dbName: string) {
        return this.storage.get(dbName);
    }

    public async remove(dbName: string) {
        this.storage.delete(dbName);
    }

    public async list() {
        return Array.from(this.storage.values());
    }

    public async deploy() {
        // no-op
    }

    public async destroy() {
        this.storage.clear();
    }

    public async exists() {
        return true;
    }
}