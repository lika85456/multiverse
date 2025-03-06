import BuildBucket from "../BuildBucket/BuildBucket";
import type { AwsToken } from "../core/AwsToken";
import type { Region } from "../core/DatabaseConfiguration";

async function getEnvironment({ awsToken, region }: {awsToken: AwsToken | undefined, region: Region}) {
    const buildBucket = new BuildBucket("multiverse-build-bucket-test", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        awsToken: awsToken as any,
        region
    });

    if (!buildBucket.exists()) {
        await buildBucket.deploy();
    }
}