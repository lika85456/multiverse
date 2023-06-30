import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { v4 } from "uuid";

const id = v4();

export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context
// eslint-disable-next-line @typescript-eslint/require-await
): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "hello world",
            id
        }),
    };
};