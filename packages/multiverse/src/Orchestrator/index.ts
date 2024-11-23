/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * This is the entry point for Orchestrator lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { ORCHESTRATOR_ENV } from "./env";
import InfrastructureStorage from "../InfrastructureStorage/DynamoInfrastructureStorage";
import Orchestrator from "./OrchestratorWorker";
import type { OrchestratorEvent } from "./Orchestrator";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";
import BucketChangesStorage from "../ChangesStorage/BucketChangesStorage";

const databaseConfiguration = ORCHESTRATOR_ENV.DATABASE_CONFIG;

const changesStorage = new BucketChangesStorage(ORCHESTRATOR_ENV.BUCKET_CHANGES_STORAGE, {
    region: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER.region,
    awsToken: undefined as any,
    maxObjectAge: 1000 * 60 * 60 // 1 hour
});

const infrastructureStorage = new InfrastructureStorage({
    tableName: ORCHESTRATOR_ENV.INFRASTRUCTURE_TABLE,
    region: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER.region,
    awsToken: undefined as any
});

const snapshotStorage = new S3SnapshotStorage({
    bucketName: ORCHESTRATOR_ENV.SNAPSHOT_BUCKET,
    databaseId: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER,
    awsToken: undefined as any
});

const orchestrator = new Orchestrator({
    changesStorage,
    databaseConfiguration,
    databaseId: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER,
    infrastructureStorage,
    snapshotStorage,
    awsToken: undefined as any
});

orchestrator.initialize();

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

    const e = JSON.parse(event.body) as OrchestratorEvent;

    const authorized = await orchestrator.auth(e.secretToken);

    if (!authorized) {
        return {
            statusCode: 403,
            body: "Unauthorized"
        };

    }

    try {
        // @ts-ignore
        const result = await orchestrator[e.event](...e.payload);

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? `${e.message}\n${e.stack}` : JSON.stringify(e);
        log.error(errorMessage);

        if (ORCHESTRATOR_ENV.NODE_ENV === "production") {

            return {
                statusCode: 500,
                body: "Internal Server Error"
            };
        }

        return {
            statusCode: 500,
            body: errorMessage
        };
    }

}