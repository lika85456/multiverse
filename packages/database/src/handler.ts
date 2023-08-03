import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import type KNN from "./knn";
import { z } from "zod";

export const handlerGenerator = (knn: KNN, instanceId: string) => {

    return async(
        event: APIGatewayProxyEvent,
        context: Context
    ): Promise<APIGatewayProxyResult> => {

        // Allow only POST, so caching is not a problem
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405,
                body: JSON.stringify({ message: "Method Not Allowed" })
            };
        }

        console.debug(event, context);

        if (event.path === "/knn") {
            const knnBodySchema = z.object({
                query: z.array(z.number()),
                k: z.number().positive().default(1),
                updates: z.array(z.object({
                    label: z.number(),
                    vector: z.array(z.number()).optional(),
                    // true optional
                    deactivated: z.boolean().optional()
                })).optional(),
                updateTimestamp: z.number().optional()
            });

            const result = knnBodySchema.safeParse(JSON.parse(event.body ?? "{}"));
            const dimensions = await knn.collection().dimensions();

            if (!result.success || await dimensions !== result.data.query.length) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Bad Request" })
                };
            }

            const {
                query, k, updates, updateTimestamp
            } = result.data;

            // TODO: updating should be done asynchronously after search
            if (updates?.length) {

                if (updateTimestamp === undefined) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: "Missing update timestamp" })
                    };
                }

                await knn.update(updates as any, updateTimestamp);
            }

            const searchResult = await knn.search(query, k);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    searchResult,
                    instanceId: instanceId,
                    lastUpdateTimestamp: knn.lastTimeUpdated()
                })
            };
        }

        if (event.path === "/wait") {
            const { time } = JSON.parse(event.body ?? "{}");
            await new Promise(resolve => setTimeout(resolve, time));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "OK",
                    instanceId
                })
            };
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not Found" })
        };
    };
};