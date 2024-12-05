/* eslint-disable turbo/no-undeclared-env-vars */
/**
 * This is the entry point for Compute lambda.
 */

import log from "@multiverse/log";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import HNSWIndex from "../Index/HNSWIndex";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";
import type { Worker } from "./Worker";
import ComputeWorker from "./ComputeWorker";
import { databaseEnvSchema } from "./EnvSchema";
import BucketChangesStorage from "../ChangesStorage/BucketChangesStorage";

if (!process.env.VARIABLES) {
    throw new Error("Missing environment variables");
}

const env = databaseEnvSchema.parse(JSON.parse(process.env.VARIABLES));

const index = new HNSWIndex(env.DATABASE_CONFIG);

const snapshotStorage = new S3SnapshotStorage({
    bucketName: env.SNAPSHOT_BUCKET,
    databaseId: env.DATABASE_IDENTIFIER,
    downloadPath: "/tmp",
    awsToken: undefined as any
});

const changesStorage = new BucketChangesStorage(env.BUCKET_CHANGES_STORAGE, {
    region: env.DATABASE_IDENTIFIER.region,
    awsToken: undefined as any,
    maxObjectAge: 1000 * 60 * 60 // 1 hour
});

// TODO!: change size from ENV variables
const databaseWorker = new ComputeWorker({
    partitionIndex: env.PARTITION,
    ephemeralLimit: 1024,
    changesStorage,
    index,
    memoryLimit: 512,
    snapshotStorage
});

export type DatabaseEvent = {
    event: keyof Worker;
    payload: Parameters<Worker[keyof Worker]>;
    waitTime?: number;
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    if (!event.body) {
        return {
            statusCode: 400,
            body: "Missing event body"
        };
    }

    const e = JSON.parse(event.body) as DatabaseEvent;

    try {
        // @ts-ignore
        const result = await databaseWorker[e.event](...e.payload);

        if (e.waitTime) {
            await new Promise(resolve => setTimeout(resolve, e.waitTime));
        }

        log.debug("Received event", {
            action: e.event,
            waitTime: e.waitTime
        });

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (e) {
        log.error("Error while processing event", {
            event,
            error: e
        });

        return {
            statusCode: 500,
            body: JSON.stringify(e)
        };
    }

}