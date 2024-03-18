import { Lambda } from "@aws-sdk/client-lambda";
import type { DatabaseInfrastructure } from "../InfrastructureStorage/DynamoInfrastructureStorage";
import type { DatabaseQuery, DatabaseQueryResult } from "./DatabaseClient";
import type DatabaseClient from "./DatabaseClient";
import log from "@multiverse/log";

class LambdaDatabaseClient implements DatabaseClient {

    private lambda: Lambda;

    constructor(private lambdaName: string, private infrastructure: DatabaseInfrastructure) {
        this.lambda = new Lambda({ region: infrastructure.configuration.region });
    }

    private async invoke(payload: any): Promise<any> {

        log.debug("Invoking lambda", {
            lambdaName: this.lambdaName,
            payload
        });

        const result = await this.lambda.invoke({
            FunctionName: this.lambdaName,
            Payload: JSON.stringify({ body: JSON.stringify(payload) })
        });

        const uintPayload = new Uint8Array(result.Payload as ArrayBuffer);

        if (result.FunctionError) {
            log.error({ result: JSON.parse(Buffer.from(uintPayload).toString("utf-8")) });
            throw new Error(result.FunctionError);
        }

        log.debug("Lambda invoked", {
            lambdaName: this.lambdaName,
            result: JSON.parse(Buffer.from(uintPayload).toString("utf-8"))
        });

        return JSON.parse(JSON.parse(Buffer.from(uintPayload).toString("utf-8")).body);
    }

    public async query(query: DatabaseQuery): Promise<DatabaseQueryResult> {
        return await this.invoke({
            event: "query",
            payload: [query]
        });
    }

    public async wake(wait: number): Promise<void> {
        await this.invoke({
            event: "wake",
            payload: [wait]
        });
    }

    public async saveSnapshot(): Promise<void> {
        await this.invoke({
            event: "saveSnapshot",
            payload: []
        });
    }

    public async loadLatestSnapshot(): Promise<void> {
        await this.invoke({
            event: "loadLatestSnapshot",
            payload: []
        });
    }

    public async count(): Promise<{ vectors: number; vectorDimensions: number; }> {
        const result = await this.invoke({
            event: "count",
            payload: []
        });

        return {
            vectors: result.vectors,
            vectorDimensions: result.vectorDimensions
        };
    }

}

export default function lambdaDatabaseClientFactory(partitionIndex: number, infrastructure: DatabaseInfrastructure): DatabaseClient {
    const partition = infrastructure.partitions[partitionIndex];

    const lambdaName = partition.lambda[0].name;

    return new LambdaDatabaseClient(lambdaName, infrastructure);
}