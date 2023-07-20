import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import AWS from "aws-sdk";

AWS.config.update({ region: "eu-central-1" });

// Create the DynamoDB service object
const db = new AWS.DynamoDB.DocumentClient();

// eslint-disable-next-line turbo/no-undeclared-env-vars
const tableName = process.env.TABLE_NAME ?? "";

function randomVector(dimensions: number): {
    label: string;
    vector: number[];
} {
    const vector: number[] = [];
    for (let i = 0; i < dimensions; i++) {
        vector.push(Math.random());
    }
    return {
        label: Math.random().toString(36).substring(7),
        vector,
    };
}

export const handler = async(
    event: APIGatewayProxyEvent,
    _context: Context

): Promise<APIGatewayProxyResult> => {

    if (event.httpMethod === "GET") {
        // find all items in the table
        const params = { TableName: tableName, };
        const start = Date.now();
        const data = await db.scan(params).promise();
        const end = Date.now();
        return {
            statusCode: 200,
            body: JSON.stringify({
                data,
                time: end - start
            }),
        };
    }

    if (event.httpMethod === "POST") {
        // add 10000 vectors to the table
        const params = {
            RequestItems: {
                [tableName]:
                    Array(10000).fill(0)
                        .map(() => {
                            const { label, vector } = randomVector(100);
                            return {
                                PutRequest: {
                                    Item: {
                                        "id": { S: label },
                                        "vector": { S: JSON.stringify(vector) }
                                    }
                                }
                            };
                        })
            }
        };
        const data = await db.batchWrite(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    }

    return {
        statusCode: 400,
        body: "Bad Request",
    };
};