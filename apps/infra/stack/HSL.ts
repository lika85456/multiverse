/**
 * Horizontally scaled lambda
 */

import type { App, StackProps } from "aws-cdk-lib";
import {
    RemovalPolicy, Stack, Aws, aws_s3objectlambda
} from "aws-cdk-lib";
import {
    PolicyStatement, AnyPrincipal, Effect, AccountRootPrincipal, PolicyDocument, ArnPrincipal
} from "aws-cdk-lib/aws-iam";
import type { FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import type { RestApi } from "aws-cdk-lib/aws-apigateway";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import {
    BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption, CfnAccessPoint
} from "aws-cdk-lib/aws-s3";
// import { Stack, CfnOutput, Aws
// } from "aws-cdk-lib";
// import {
//     aws_iam as iam,
//     aws_s3 as s3,
//     aws_lambda as lambda,
//     aws_s3objectlambda as s3ObjectLambda,
// } from "aws-cdk-lib";
// import type { Construct } from "constructs";

// configurable variables
// const S3_ACCESS_POINT_NAME = "example-test-ap";
// const OBJECT_LAMBDA_ACCESS_POINT_NAME = "s3-object-lambda-ap";

// export class S3ObjectLambdaStack extends Stack {
//     constructor(scope: Construct, id: string, props?: StackProps) {
//         super(scope, id, props);

//         const accessPoint = `arn:aws:s3:${Aws.REGION}:${Aws.ACCOUNT_ID}:accesspoint/${S3_ACCESS_POINT_NAME}`;

//         // Set up a bucket
//         const bucket = new s3.Bucket(this, "example-bucket", {
//             accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
//             encryption: s3.BucketEncryption.S3_MANAGED,
//             blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
//         });

//         // Delegating access control to access points
//         // https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
//         bucket.addToResourcePolicy(new iam.PolicyStatement({
//             actions: ["*"],
//             principals: [new iam.AnyPrincipal()],
//             resources: [
//                 bucket.bucketArn,
//                 bucket.arnForObjects("*")
//             ],
//             conditions: {
//                 "StringEquals":
//         {"s3:DataAccessPointAccount": `${Aws.ACCOUNT_ID}`}
//             }
//         }));

//         // lambda to process our objects during retrieval
//         const retrieveTransformedObjectLambda = new lambda.Function(this, "retrieveTransformedObjectLambda", {
//             runtime: lambda.Runtime.NODEJS_14_X,
//             handler: "index.handler",
//             code: lambda.Code.fromAsset("resources/retrieve-transformed-object-lambda")
//         });

//         // Object lambda s3 access
//         retrieveTransformedObjectLambda.addToRolePolicy(new iam.PolicyStatement({
//             effect: iam.Effect.ALLOW,
//             resources: ["*"],
//             actions: ["s3-object-lambda:WriteGetObjectResponse"]
//         }));
//         // Restrict Lambda to be invoked from own account
//         retrieveTransformedObjectLambda.addPermission("invocationRestriction", {
//             action: "lambda:InvokeFunction",
//             principal: new iam.AccountRootPrincipal(),
//             sourceAccount: Aws.ACCOUNT_ID
//         });

//         // Associate Bucket's access point with lambda get access
//         const policyDoc = new iam.PolicyDocument({
//             statements: [
//                 new iam.PolicyStatement({
//                     sid: "AllowLambdaToUseAccessPoint",
//                     effect: iam.Effect.ALLOW,
//                     actions: ["s3:GetObject"],
//                     principals: [
//                         new iam.ArnPrincipal(<string>retrieveTransformedObjectLambda.role?.roleArn)
//                     ],
//                     resources: [`${accessPoint}/object/*`]
//                 })
//             ]
//         });

//         new s3.CfnAccessPoint(this, "exampleBucketAP", {
//             bucket: bucket.bucketName,
//             name: S3_ACCESS_POINT_NAME,
//             policy: policyDoc
//         });

//         // Access point to receive GET request and use lambda to process objects
//         const objectLambdaAP = new s3ObjectLambda.CfnAccessPoint(this, "s3ObjectLambdaAP", {
//             name: OBJECT_LAMBDA_ACCESS_POINT_NAME,
//             objectLambdaConfiguration: {
//                 supportingAccessPoint: accessPoint,
//                 transformationConfigurations: [{
//                     actions: ["GetObject"],
//                     contentTransformation: {
//                         "AwsLambda": {"FunctionArn": `${retrieveTransformedObjectLambda.functionArn}`}
//                     }
//                 }]
//             }
//         });

//         new CfnOutput(this, "exampleBucketArn", { value: bucket.bucketArn });
//         new CfnOutput(this, "objectLambdaArn", { value: retrieveTransformedObjectLambda.functionArn });
//         new CfnOutput(this, "objectLambdaAccessPointArn", { value: objectLambdaAP.attrArn });
//         new CfnOutput(this, "objectLambdaAccessPointUrl", {value: `https://console.aws.amazon.com/s3/olap/${Aws.ACCOUNT_ID}/${OBJECT_LAMBDA_ACCESS_POINT_NAME}?region=${Aws.REGION}`});
//     }
// }

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

        // s3 object lambda bucket for indexes and collections
        const bucket = new Bucket(this, "collections-" + id.toLocaleLowerCase(), {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
        });

        // Delegating access control to access points
        // https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
        bucket.addToResourcePolicy(new PolicyStatement({
            actions: ["*"],
            principals: [new AnyPrincipal()],
            resources: [
                bucket.bucketArn,
                bucket.arnForObjects("*")
            ],
            conditions: {
                "StringEquals":
            { "s3:DataAccessPointAccount": `${Aws.ACCOUNT_ID}` }
            }
        }));

        const orchestratorLambda = new LambdaFunction(this, "OrchestratorLambda", props.orchestratorProps);

        // allow orchestrator to cloudformation:ListStackResources so it can get the ARNs of the lambdas
        orchestratorLambda.addToRolePolicy(new PolicyStatement({
            resources: [this.stackId],
            actions: ["cloudformation:ListStackResources"],
        }));

        const lambdaArns = [];

        for (let i = 1; i <= props.mainRegionReplicas; i++) {

            const accessPointName = `collections-ap-${id.toLocaleLowerCase()}-${i}`;
            const objectLambdaAccessPointName = `olap-${id.toLocaleLowerCase()}-${i}`;
            const accessPoint = `arn:aws:s3:${Aws.REGION}:${Aws.ACCOUNT_ID}:accesspoint/${accessPointName}`;

            const lambdaFunction = new LambdaFunction(this, `LambdaFunction${i}`, {
                ...props.functionProps,
                environment: {
                    ...props.functionProps.environment,
                    REPLICA_ID: `${i}`,
                    ACCESS_POINT_ARN: accessPoint,
                    BUCKET: bucket.bucketName,
                },
            });

            // allow orchestratorLambda to invoke lambdaFunction
            orchestratorLambda.addToRolePolicy(new PolicyStatement({
                resources: [lambdaFunction.functionArn],
                actions: ["lambda:InvokeFunction"],
            }));

            // Object lambda s3 access
            lambdaFunction.addToRolePolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                resources: ["*"],
                actions: ["s3-object-lambda:WriteGetObjectResponse"]
            }));

            // Restrict Lambda to be invoked from own account
            lambdaFunction.addPermission("invocationRestriction", {
                action: "lambda:InvokeFunction",
                principal: new AccountRootPrincipal(),
                sourceAccount: Aws.ACCOUNT_ID
            });

            // Associate Bucket's access point with lambda get access
            const policyDoc = new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: "AllowLambdaToUseAccessPoint",
                        effect: Effect.ALLOW,
                        actions: ["s3:GetObject"],
                        principals: [
                            new ArnPrincipal(<string>lambdaFunction.role?.roleArn)
                        ],
                        resources: [`${accessPoint}/object/*`]
                    })
                ]
            });

            new CfnAccessPoint(this, `bucket-ap-${id.toLocaleLowerCase()}-${i}`, {
                bucket: bucket.bucketName,
                name: accessPointName,
                policy: policyDoc
            });

            new aws_s3objectlambda.CfnAccessPoint(this, `olap-${id.toLocaleLowerCase()}-${i}`, {
                name: objectLambdaAccessPointName,
                objectLambdaConfiguration: {
                    supportingAccessPoint: accessPoint,
                    transformationConfigurations: [{
                        actions: ["GetObject"],
                        contentTransformation: { "AwsLambda": { "FunctionArn": `${lambdaFunction.functionArn}` } }
                    }]
                }
            });

            lambdaArns.push(lambdaFunction.functionArn);

            // User: arn:aws:sts::529734186765:assumed-role/Multiverse-Test-OrchestratorLambdaServiceRole403C7-1CB04Z7H00GMC/Multiverse-Test-OrchestratorLambdaA7A0AD32-J9rA5eX5Pukt is not authorized to perform: lambda:InvokeFunction on resource: arn:aws:lambda:eu-central-1:529734186765:function:Multiverse-Test-CustomS3AutoDeleteObjectsCustomRes-ylAbQnR81gGR because no identity-based policy allows the lambda:InvokeFunction action
        }

        // arn:aws:lambda:eu-central-1:529734186765:function:Multiverse-Test-
        orchestratorLambda.addToRolePolicy(new PolicyStatement({
            resources: [...lambdaArns, `arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:${Aws.STACK_NAME}-*`],
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