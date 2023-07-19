import type { App } from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

/**
 * Creates API Gateway for all orchestrator lambdas.
 *
 * Path to orchestrator lambdas should be /orchestrator/{lambdaId}
 * where lambdaId is the id of the stack that contains the lambda.
 */
export default class ApiGateway extends Stack {

    private gatewayApi: apigateway.RestApi;

    constructor(scope: App, id: string) {
        super(scope, id);

        this.gatewayApi = new apigateway.RestApi(this, "MultiverseAPI", {
            restApiName: "MultiverseAPI",
            description: "Gateway for the Multiverse",
            deployOptions: { stageName: "dev" }
        });
    }

    public gateway(): apigateway.RestApi {
        return this.gatewayApi;
    }
}