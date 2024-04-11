/**
 * This is the entry point for Compute lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import { databaseEnvSchema } from "./env";
import HNSWIndex from "../Index/HNSWIndex";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";
import type { Worker } from "./Worker";
import ComputeWorker from "./ComputeWorker";

const env = databaseEnvSchema.parse(process.env);

const changesStorage = new DynamoChangesStorage({
    tableName: env.CHANGES_TABLE,
    region: env.DATABASE_CONFIG.region,
    dimensions: env.DATABASE_CONFIG.dimensions,
    space: env.DATABASE_CONFIG.space,
    name: env.DATABASE_CONFIG.name,
});

const index = new HNSWIndex({
    dimensions: env.DATABASE_CONFIG.dimensions,
    region: env.DATABASE_CONFIG.region,
    space: env.DATABASE_CONFIG.space,
    name: env.DATABASE_CONFIG.name,
});

const snapshotStorage = new S3SnapshotStorage({
    bucketName: env.SNAPSHOT_BUCKET,
    name: env.DATABASE_CONFIG.name,
    region: env.DATABASE_CONFIG.region,
    downloadPath: "/tmp"
});

const databaseWorker = new ComputeWorker({
    changesStorage,
    config: env.DATABASE_CONFIG,
    ephemeralLimit: 1024,
    index,
    memoryLimit: 512,
    snapshotStorage
});

export type DatabaseEvent = {
    event: keyof Worker,
    payload: Parameters<Worker[keyof Worker]>
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

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}