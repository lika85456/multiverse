import type SuperLambda from "@multiverse/super-lambda/src";
import type { IndexConfiguration } from "../IndexConfiguration";
import type VectorStore from "../VectorStore/VectorStore";

export default class Orchestrator {
    constructor(private options: {
        database: IndexConfiguration,
        vectorStore: VectorStore,
        databaseLambda: SuperLambda
    }) {

    }
}