import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { v4 } from "uuid";

const id = v4();
// eslint-disable-next-line turbo/no-undeclared-env-vars
const { REPLICA_ID } = process.env;

export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context
// eslint-disable-next-line @typescript-eslint/require-await
): Promise<APIGatewayProxyResult> => {

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "hello world2",
            id,
            replicaId: REPLICA_ID
        }),
    };
};