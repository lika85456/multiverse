/* eslint-disable turbo/no-undeclared-env-vars */
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import { v4 } from "uuid";
import { callLambda, getLambdas } from "./CloudFormationManager";

const id = v4();

const { STACK_ID } = process.env;

export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context

): Promise<APIGatewayProxyResult> => {

    try {
        const lambdas = await getLambdas(STACK_ID!);

        const result = await Promise.all(lambdas.map(async(lambda) => {
            const start = Date.now();
            const result = await callLambda({
                stackResourcesSummary: lambda,
                payload: { message: "hello from orchestrator" }
            });
            const end = Date.now();

            return {
                ...result,
                time: end - start
            };
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