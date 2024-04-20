/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * This is the entry point for Orchestrator lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { ORCHESTRATOR_ENV } from "./env";
import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import InfrastructureStorage from "../InfrastructureStorage/DynamoInfrastructureStorage";
import Orchestrator from "./OrchestratorWorker";

type OrchestratorEvent = {
    event: keyof Orchestrator,
    payload: Parameters<Orchestrator[keyof Orchestrator]>
};

const databaseConfiguration = ORCHESTRATOR_ENV.DATABASE_CONFIG;

const changesStorage = new DynamoChangesStorage({
    tableName: ORCHESTRATOR_ENV.CHANGES_TABLE,
    databaseId: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER
});

const infrastructureStorage = new InfrastructureStorage({
    tableName: ORCHESTRATOR_ENV.INFRASTRUCTURE_TABLE,
    region: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER.region,
});

const orchestrator = new Orchestrator({
    changesStorage,
    databaseConfiguration,
    databaseId: ORCHESTRATOR_ENV.DATABASE_IDENTIFIER,
    infrastructureStorage
});

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

    // @ts-ignore
    const result = await orchestrator[e.event](...e.payload);

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}