import type SuperLambda from "@multiverse/super-lambda/src";
import type { DatabaseConfig } from "../DatabaseConfig";
import type VectorStore from "../VectorStore/VectorStore";

export default class Orchestrator {
    constructor(private options: {
        database: DatabaseConfig,
        vectorStore: VectorStore,
        databaseLambda: SuperLambda
    }) {

    }
}