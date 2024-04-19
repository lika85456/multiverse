/* eslint-disable turbo/no-undeclared-env-vars */
/**
 * This is the entry point for Compute lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import HNSWIndex from "../Index/HNSWIndex";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";
import type { Worker } from "./Worker";
import ComputeWorker from "./ComputeWorker";
import { databaseEnvSchema } from "./EnvSchema";

if (!process.env.VARIABLES) {
    throw new Error("Missing environment variables");
}

const env = databaseEnvSchema.parse(JSON.parse(process.env.VARIABLES));

const changesStorage = new DynamoChangesStorage({
    tableName: env.CHANGES_TABLE,
    databaseId: env.DATABASE_IDENTIFIER
});

const index = new HNSWIndex(env.DATABASE_CONFIG);

const snapshotStorage = new S3SnapshotStorage({
    bucketName: env.SNAPSHOT_BUCKET,
    databaseId: env.DATABASE_IDENTIFIER,
    downloadPath: "/tmp"
});

const databaseWorker = new ComputeWorker({
    changesStorage,
    partitionIndex: env.PARTITION,
    ephemeralLimit: 1024,
    index,
    memoryLimit: 512,
    snapshotStorage
});

export type DatabaseEvent = {
    event: keyof Worker;
    payload: Parameters<Worker[keyof Worker]>;
    waitTime?: number;
};

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context,
): Promise<APIGatewayProxyResult> {
    log.debug("Received event", {
        event,
        context,
        environment: process.env,
    });

    if (!event.body) {
        return {
            statusCode: 400,
            body: "Missing event body"
        };
    }

    const e = JSON.parse(event.body) as DatabaseEvent;

    // @ts-ignore
    const result = await databaseWorker[e.event](...e.payload);

    if (e.waitTime) {
        await new Promise(resolve => setTimeout(resolve, e.waitTime));
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}