import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type VectorDatabase from "../VectorDatabase";

export default (database: VectorDatabase) => async(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const parsedPayload = JSON.parse(event.body ?? "");

    const action = parsedPayload.action as keyof VectorDatabase;
    const payload = parsedPayload.payload;

    try {
        const actionResult = await database[action](payload);

        return {
            statusCode: 200,
            body: JSON.stringify(actionResult, null, 2),
        };

    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify(e, null, 2),
        };
    }
};