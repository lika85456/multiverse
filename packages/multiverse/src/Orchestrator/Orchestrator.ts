import type { DatabaseConfig } from "../DatabaseConfig";
import type VectorStore from "../VectorStore/VectorStore";

const instances = new Map<string, {instanceId: string, lastUpdateTimestamp: number}>();

export default class Orchestrator {
    constructor(private options: {
        database: DatabaseConfig,
        vectorStore: VectorStore
    }) {

    }
}