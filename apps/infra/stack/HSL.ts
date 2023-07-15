/**
 * Horizontally scaled lambda
 */

import type { App, StackProps } from "aws-cdk-lib";
import {
    Stack, Aws, RemovalPolicy
} from "aws-cdk-lib";
import { PolicyStatement, AccountRootPrincipal } from "aws-cdk-lib/aws-iam";
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

        const collectionsBucket = new Bucket(this, `collections-bucket-${id}`, {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });

        const orchestratorLambda = new LambdaFunction(this, "OrchestratorLambda", {
            ...props.orchestratorProps,
            environment: {
                ...props.orchestratorProps.environment,
                COLLECTIONS_BUCKET: collectionsBucket.bucketName,
            }
        });

        // allow orchestrator lambda to access the collections bucket
        collectionsBucket.grantReadWrite(orchestratorLambda);

        // allow orchestrator to cloudformation:ListStackResources so it can get the ARNs of the lambdas
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

            // Restrict Lambda to be invoked from own account
            lambdaFunction.addPermission("invocationRestriction", {
                action: "lambda:InvokeFunction",
                principal: new AccountRootPrincipal(),
                sourceAccount: Aws.ACCOUNT_ID
            });

            // allow lambdaFunction to access the collections bucket
            collectionsBucket.grantReadWrite(lambdaFunction);

            lambdaArns.push(lambdaFunction.functionArn);
        }

        // Connect the API Gateway to the orchestratorLambda
        props.apiGateway
            .root
            .resourceForPath("/orchestrator")
            .addResource(`${id}`)
            .addMethod("ANY", new LambdaIntegration(orchestratorLambda));

    }
}