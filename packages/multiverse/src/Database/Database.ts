/**
 * This is the entry point for Database lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import DatabaseWorker from "./DatabaseWorker";
import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import { databaseEnvSchema } from "./DatabaseEnvironment";
import HNSWIndex from "../Index/HNSWIndex";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";

const env = databaseEnvSchema.parse(process.env);

const changesStorage = new DynamoChangesStorage({
    indexName: env.INDEX_CONFIG.indexName,
    owner: env.INDEX_CONFIG.owner,
    partition: env.PARTITION,
    tableName: env.CHANGES_TABLE,
    region: env.INDEX_CONFIG.region
});

const index = new HNSWIndex({
    dimensions: env.INDEX_CONFIG.dimensions,
    indexName: env.INDEX_CONFIG.indexName,
    owner: env.INDEX_CONFIG.owner,
    region: env.INDEX_CONFIG.region,
    space: env.INDEX_CONFIG.space,
});

const snapshotStorage = new S3SnapshotStorage({
    bucketName: env.SNAPSHOT_BUCKET,
    indexName: env.INDEX_CONFIG.indexName,
    region: env.INDEX_CONFIG.region,
    downloadPath: "/tmp"
});

const databaseWorker = new DatabaseWorker({
    changesStorage,
    config: env.INDEX_CONFIG,
    ephemeralLimit: 1024,
    index,
    memoryLimit: 512,
    snapshotStorage
});

export type DatabaseEvent = {
    event: keyof DatabaseWorker,
    payload: Parameters<DatabaseWorker[keyof DatabaseWorker]>
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