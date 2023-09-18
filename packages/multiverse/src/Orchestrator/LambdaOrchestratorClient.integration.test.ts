import log from "@multiverse/log";
import { Vector } from "../Vector";
import LambdaOrchestratorClient from "./LambdaOrchestratorClient";

describe("<LambdaOrchestratorClient>", () => {
    const client = new LambdaOrchestratorClient({
        indexConfiguration: {
            dimensions: 1536,
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            space: "cosine",
        }
    });

    it("should wait", async() => {
        await client.wake();
    });

    it("should query", async() => {
        const result = await client.query({
            k: 10,
            vector: Vector.randomArray(1536),
        });

        log.debug("Query result", { result });
    });
});