import log from "@multiverse/log";
import BuildBucket from "@multiverse/multiverse/src/BuildBucket/BuildBucket";
import LambdaOrchestrator from "@multiverse/multiverse/src/Orchestrator/LambdaOrchestrator";

const handler = async(req: Request) => {

    // Bearer token is required to access the API
    const bearerToken = req.headers.get("Authorization");

    if (!bearerToken) {
        return new Response("Unauthorized", { status: 401 });
    }

    const awsToken = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, turbo/no-undeclared-env-vars
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, turbo/no-undeclared-env-vars
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    };

    const buildBucket = new BuildBucket("multiverse-build-mydb-699669696", {
        awsToken,
        region: "eu-central-1"
    });

    await buildBucket.deploy();

    try {
        await LambdaOrchestrator.build(buildBucket);
    } catch (e) {
        log.error(e);
    }
};

export { handler as POST };