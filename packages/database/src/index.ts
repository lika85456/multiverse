import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { v4 } from "uuid";
import { HierarchicalNSW } from "hnswlib-node";

const numDataPoints = 1000;
const numDimensions = 8;

// loading index.
const index = new HierarchicalNSW("l2", numDimensions);
index.initIndex(numDataPoints);

// add 1000 random data points to index.

for (let i = 0; i < numDataPoints; i++) {
    const dataPoint = new Array(numDimensions) as number[];
    for (let j = 0; j < numDimensions; j++) dataPoint[j] = Math.random();
    index.addPoint(dataPoint, Math.random());
}

// preparing query data points.
const query = new Array(numDimensions) as number[];
for (let j = 0; j < numDimensions; j++) query[j] = Math.random();

// searching k-nearest neighbor data points.
const numNeighbors = 3;

const id = v4();
// eslint-disable-next-line turbo/no-undeclared-env-vars
const { REPLICA_ID } = process.env;

export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context
// eslint-disable-next-line @typescript-eslint/require-await
): Promise<APIGatewayProxyResult> => {

    const result = index.searchKnn(query, numNeighbors);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "hello world2",
            id,
            replicaId: REPLICA_ID,
            result
        }),
    };
};