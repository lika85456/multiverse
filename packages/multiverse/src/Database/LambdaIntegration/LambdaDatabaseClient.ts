import type DatabaseClient from "../DatabaseClient";
import type SuperLambda from "@multiverse/super-lambda/src";
import type { VectorDatabaseQuery, VectorDatabaseQueryResult } from "../Vector";

export default class LambdaDatabaseClient implements DatabaseClient {
    constructor(private lambda: SuperLambda) {

    }

    private async safeInvoke(action: keyof DatabaseClient, payload: any): Promise<object> {
        const result = await this.lambda.invoke({
            action,
            payload
        });

        const parsedPayload = JSON.parse(result.Payload?.toString() ?? "");

        return parsedPayload;
    }

    async query(query: VectorDatabaseQuery): Promise<VectorDatabaseQueryResult> {
        return this.safeInvoke("query", query) as Promise<VectorDatabaseQueryResult>;
    }

    async indexCollection(): Promise<void> {
        return this.safeInvoke("indexCollection", null) as unknown as Promise<void>;
    }

    loadIndexCollection(): Promise<void> {
        return this.safeInvoke("loadIndexCollection", null) as unknown as Promise<void>;
    }
}