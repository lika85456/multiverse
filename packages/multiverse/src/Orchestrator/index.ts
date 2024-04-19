/**
 * This is the entry point for Orchestrator lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import IndexManager from "./OLD/IndexManager";
import InfrastructureManager from "./OLD/InfrastructureManager";
import { ORCHESTRATOR_ENV } from "./env";
import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import InfrastructureStorage from "../InfrastructureStorage/DynamoInfrastructureStorage";
import lambdaDatabaseClientFactory from "../Compute/LambdaWorker";
import type Orchestrator from "./Orchestrator";

type OrchestratorEvent = {
    event: keyof Orchestrator,
    payload: Parameters<Orchestrator[keyof Orchestrator]>
};

const indexConfiguration = ORCHESTRATOR_ENV.DATABASE_CONFIG;

const changesStorage = new DynamoChangesStorage({
    tableName: ORCHESTRATOR_ENV.CHANGES_TABLE,
    databaseId: 
});

const infrastructureStorage = new InfrastructureStorage({
    region: indexConfiguration.region,
    tableName: ORCHESTRATOR_ENV.INFRASTRUCTURE_TABLE
});

const indexManager = new IndexManager({
    changesStorage,
    databasePartitionFactory: lambdaDatabaseClientFactory,
    indexConfiguration,
    infrastructureStorage
});

const infrastructureManager = new InfrastructureManager({
    changesTable: ORCHESTRATOR_ENV.CHANGES_TABLE,
    indexConfiguration,
    infrastructureStorage,
    snapshotBucket: ORCHESTRATOR_ENV.SNAPSHOT_BUCKET,
});

const orchestratorWorker = new OrchestratorWorker({
    indexManager,
    infrastructureManager
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
    const result = await orchestratorWorker[e.event](...e.payload);

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}