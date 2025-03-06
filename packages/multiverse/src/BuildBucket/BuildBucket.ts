import { S3 } from "@aws-sdk/client-s3";
import type { AwsToken } from "..";
import log from "@multiverse/log";
import keepAliveAgent from "../keepAliveAgent";

export default class BuildBucket {

    private s3: S3;

    constructor(public name: string, private options: {
        region: string;
        awsToken: AwsToken;
    }) {
        this.s3 = new S3({
            region: this.options.region,
            credentials: this.options.awsToken,
            requestHandler: keepAliveAgent
        });
    }

    public getResourceName() {
        return this.name;
    }

    async deploy() {
        log.info(`Creating build bucket ${this.name}`);

        if (await this.exists()) {
            log.info(`Bucket ${this.name} already exists`);

            return;
        }

        const result = await this.s3.createBucket({ Bucket: this.name });

        if (!result.Location) {
            throw new Error("Failed to create bucket");
        }

        log.info(`Created build bucket ${this.name}`);
    }

    async destroy() {
        log.info(`Destroying build bucket ${this.name}`);
        // first clear
        const objects = await this.s3.listObjectsV2({ Bucket: this.name });

        if (objects.Contents) {
            await this.s3.deleteObjects({
                Bucket: this.name,
                Delete: { Objects: objects.Contents.map(object => ({ Key: object.Key })) }
            });
        }

        await this.s3.deleteBucket({ Bucket: this.name });
    }

    async exists() {
        try {
            await this.s3.headBucket({ Bucket: this.name });

            return true;
        } catch (e) {
            return false;
        }
    }

    async uploadLatestBuild(buffer: Buffer) {
        const key = "latest.zip";

        await this.s3.putObject({
            Bucket: this.name,
            Key: key,
            Body: buffer
        });
    }

    async getLatestBuildKey(): Promise<{
        S3Bucket: string,
        S3Key: string
    } | null> {

        try {
            await this.s3.headObject({
                Bucket: this.name,
                Key: "latest.zip"
            });

        } catch (e) {
            return null;
        }

        return {
            S3Bucket: this.name,
            S3Key: "latest.zip"
        };
    }
}