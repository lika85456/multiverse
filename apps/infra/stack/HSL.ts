/**
 * Horizontally scaled lambda
 */

import type { App, StackProps } from "aws-cdk-lib";
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import type { RestApi } from "aws-cdk-lib/aws-apigateway";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Bucket } from "aws-cdk-lib/aws-s3";
export type HorizontallyScaledLambdaProps = StackProps & {
    /**
     * The number of replicas in the main region
     */
    mainRegionReplicas: number,
    // /**
    //  * The number of single replicas in each region
    //  */
    // regionReplicas: number,
    /**
     * The interval in seconds to warm up the lambda
     */
    warmInterval: number,

    functionProps: FunctionProps,

    orchestratorProps: FunctionProps,

    apiGateway: RestApi; // Existing API Gateway object
};

export default class HorizontallyScaledLambda extends Stack {

    constructor(scope: App, id: string, props: HorizontallyScaledLambdaProps) {
        super(scope, id, props);

        // s3 bucket for indexes and collections
        const bucket = new Bucket(this, "collections", {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });

        const orchestratorLambda = new LambdaFunction(this, "OrchestratorLambda", props.orchestratorProps);

        // add bucket to orchestratorLambda
        bucket.grantReadWrite(orchestratorLambda);

        // allow orchestrator to cloudformation:ListStackResources
        orchestratorLambda.addToRolePolicy(new PolicyStatement({
            resources: [this.stackId],
            actions: ["cloudformation:ListStackResources"],
        }));

        const lambdaArns = [];

        for (let i = 1; i <= props.mainRegionReplicas; i++) {
            const lambdaFunction = new LambdaFunction(this, `LambdaFunction${i}`, {
                ...props.functionProps,
                environment: {
                    ...props.functionProps.environment,
                    REPLICA_ID: `${i}`
                },
            });

            // allow orchestratorLambda to invoke lambdaFunction
            orchestratorLambda.addToRolePolicy(new PolicyStatement({
                resources: [lambdaFunction.functionArn],
                actions: ["lambda:InvokeFunction"],
            }));

            lambdaArns.push(lambdaFunction.functionArn);
            bucket.grantReadWrite(lambdaFunction);
        }

        orchestratorLambda.addToRolePolicy(new PolicyStatement({
            resources: lambdaArns,
            actions: ["lambda:InvokeFunction"],
        }));

        // Connect the API Gateway to the orchestratorLambda
        props.apiGateway
            .root
            .resourceForPath("/orchestrator")
            .addResource(`${id}`)
            .addMethod("ANY", new LambdaIntegration(orchestratorLambda));

    }
}