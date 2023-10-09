import { Lambda } from "@aws-sdk/client-lambda";
import type { Query, QueryResult } from "../Database/Query";
import type { IndexConfiguration } from "../IndexConfiguration";
import type { NewVector } from "../Vector";
import type OrchestratorClient from "./OrchestratorClient";
import OrchestratorDeployer from "./OrchestratorDeployer";
import log from "@multiverse/log";

export default class LambdaOrchestratorClient implements OrchestratorClient {

    private lambda: Lambda;

    constructor(private options: {
        indexConfiguration: IndexConfiguration
    }) {
        this.lambda = new Lambda({ region: options.indexConfiguration.region });
    }

    private async invoke(payload: any): Promise<any> {
        const result = await this.lambda.invoke({
            FunctionName: OrchestratorDeployer.lambdaName(this.options.indexConfiguration),
            Payload: JSON.stringify({ body: JSON.stringify(payload) })
        });

        const uintPayload = new Uint8Array(result.Payload as ArrayBuffer);

        if (result.FunctionError) {
            log.error({ result: JSON.parse(Buffer.from(uintPayload).toString("utf-8")) });
            throw new Error(result.FunctionError);
        }

        return JSON.parse(JSON.parse(Buffer.from(uintPayload).toString("utf-8")).body);
    }

    public async query(query: Query): Promise<QueryResult> {
        return this.invoke({
            event: "query",
            payload: [query]
        });
    }

    public async add(vectors: NewVector[]): Promise<void> {
        return this.invoke({
            event: "add",
            payload: [vectors]
        });
    }

    public async remove(label: string[]): Promise<void> {
        return this.invoke({
            event: "remove",
            payload: [label]
        });
    }

    public async wake(): Promise<void> {
        return this.invoke({
            event: "wake",
            payload: []
        });
    }

    public async count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        return this.invoke({
            event: "count",
            payload: []
        });
    }

}