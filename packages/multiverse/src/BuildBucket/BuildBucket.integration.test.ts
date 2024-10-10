// import { S3 } from "@aws-sdk/client-s3";
// import type { AwsToken } from "..";

// export default class BuildBucket {

//     private s3: S3;

//     constructor(public name: string, private options: {
//         region: string;
//         awsToken: AwsToken;
//     }) {
//         this.s3 = new S3({
//             region: this.options.region,
//             credentials: this.options.awsToken
//         });
//     }

//     async deploy() {
//         await this.s3.createBucket({ Bucket: this.name });
//     }

//     async destroy() {
//         await this.s3.deleteBucket({ Bucket: this.name });
//     }

//     async exists() {
//         try {
//             await this.s3.headBucket({ Bucket: this.name });

//             return true;
//         } catch (e) {
//             return false;
//         }
//     }

//     async uploadLatestBuild(zipPath: string) {
//         const key = "latest.zip";

//         await this.s3.putObject({
//             Bucket: this.name,
//             Key: key,
//             Body: zipPath
//         });
//     }

//     async getLatestBuildKey(): Promise<{
//         bucket: string,
//         key: string
//     }> {
//         return {
//             bucket: this.name,
//             key: "latest.zip"
//         };
//     }
// }

describe('<BuildBucket>', () => {
    const bucketName = 'mv-test-bucket-'+Math.random().toString(36).substring(7);

    it('should deploy a bucket', async () => {
        const bucket = new BuildBucket(bucketName, {
            region: 'us-west-1',
            awsToken: new AwsToken({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            })
        });

        await bucket.deploy();

        const exists = await bucket.exists();
        expect(exists).toBe(true);
    });

    it('should upload a build', async () => {
        const bucket = new BuildBucket(bucketName, {
            region: 'us-west-1',
            awsToken: new AwsToken({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            })
        });

        await bucket.uploadLatestBuild('./latest.zip');
    });

    
});