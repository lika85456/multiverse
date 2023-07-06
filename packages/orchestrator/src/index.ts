import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { v4 } from "uuid";
import { callLambda, getLambdas } from "./CloudFormationManager";

const id = v4();
// eslint-disable-next-line turbo/no-undeclared-env-vars
const { STACK_ID } = process.env;

export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context

): Promise<APIGatewayProxyResult> => {

    try {
        const lambdas = await getLambdas(STACK_ID!);

        const result = await Promise.all(lambdas.map(async(lambda) => {
            return callLambda(lambda, { message: "hello from orchestrator" });
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "hello from orchestrator",
                id,
                env: process.env,
                lambdas,
                result
            }),
        };
    }
    catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "error",
                error: e
            }),
        };
    }

};