import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { Context } from "vitest";
import StateMemory from "./StateMemory";
import { ENV } from "./env";
import wake from "./wake";
import DatabaseDeployer from "@multiverse/multiverse/dist/DatabaseDeployer/DatabaseDeployer";

const { DATABASE_CONFIG, COLLECTION_CONFIG } = ENV;

const databaseFnArn = new DatabaseDeployer({
    collection: COLLECTION_CONFIG,
    database: DATABASE_CONFIG
}).functionName();

// initialize state memory
const stateMemory = new StateMemory();

export const handler = async(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {

    if (event.path === "/wake") {
        const result = await wake(databaseFnArn, DATABASE_CONFIG.awakeInstances);

        return {
            statusCode: 200,
            body: JSON.stringify({ awaken: result })
        };
    }
};