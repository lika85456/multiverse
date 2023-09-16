/**
 * This is the entry point for Orchestrator lambda.
 */

import log from "@multiverse/log";
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { orchestratorEnvSchema } from "./OrchestratorEnvironment";

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context,
): Promise<APIGatewayProxyResult> {
    log.debug("Received event", {
        event,
        context,
        environment: process.env,
    });

    const _env = orchestratorEnvSchema.parse(process.env);

    return {
        body: "Hello world!",
        statusCode: 200,
    };

}