import BuildBucket from "@multiverse/multiverse/src/BuildBucket/BuildBucket";
import LambdaOrchestrator from "../packages/multiverse/src/Orchestrator/LambdaOrchestrator";
import log from "@multiverse/log";

(async() => {
    // "bun bin/deployOrchestrator.ts mv-build-bucket-dev eu-west-1"
    const args = process.argv.slice(2);
    const bucket = args[0];
    const region = args[1];
    if (!bucket) {
        throw new Error("Bucket name is required");
    }
    const buildBucket = new BuildBucket(bucket, {
        awsToken: undefined as any,
        region
    });
    await LambdaOrchestrator.build(buildBucket);
    log.info("Orchestrator build and uploaded");
})();