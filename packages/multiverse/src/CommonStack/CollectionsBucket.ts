import type { App } from "aws-cdk-lib";
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";

/**
 * Creates API Gateway for all orchestrator lambdas.
 *
 * Path to orchestrator lambdas should be /orchestrator/{lambdaId}
 * where lambdaId is the id of the stack that contains the lambda.
 */
export default class CollectionsBucket extends Stack {

    private bucket: Bucket;

    constructor(scope: App, id: string) {
        super(scope, id);

        this.bucket = new Bucket(this, "multiverse-collections", {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });
    }

    public collectionsBucket(): Bucket {
        return this.bucket;
    }
}