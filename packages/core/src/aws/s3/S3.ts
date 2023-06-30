import type {
    CreateBucketCommandOutput, ListBucketsCommandOutput, ListObjectsCommandOutput
} from "@aws-sdk/client-s3";
import { S3 as AWSS3 } from "@aws-sdk/client-s3";
import type { Region } from "../types";
import fs from "fs";
import { Readable } from "stream";

const BucketNameRegex = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export type S3Config = {
    region: Region;
};

export class S3 {

    private s3: AWSS3;

    constructor(private readonly config: S3Config) {
        this.s3 = new AWSS3({ region: this.config.region });
    }

    public async createBucket(name: string): Promise<Bucket> {

        if (!BucketNameRegex.test(name)) {
            throw new Error(`Invalid bucket name: ${name}`);
        }

        console.info(`Creating bucket ${name}`);

        const res = await this.s3.createBucket({ Bucket: name }).then(x => x).catch(e => e as CreateBucketCommandOutput);

        if (res.$metadata.httpStatusCode === 200) {
            console.info(`Created bucket ${name}`);
            return new Bucket({
                bucket: name,
                region: this.config.region
            });
        }

        throw new Error(`Unexpected error while creating bucket: ${JSON.stringify(res, null, 2)}`);
    }

    public async listBuckets(): Promise<Bucket[]> {
        const res = await this.s3.listBuckets({}).then(x => x).catch(e => e as ListBucketsCommandOutput);

        if (res.$metadata.httpStatusCode === 200 && res.Buckets) {
            return res.Buckets
                .filter(bucket => !!bucket.Name)
                .map(x => new Bucket({
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    bucket: x.Name!,
                    region: this.config.region
                }));
        }

        throw new Error(`Unexpected error while listing buckets: ${JSON.stringify(res, null, 2)}`);
    }
}

export type BucketConfig = {
    region: Region;
    bucket: string;
};

export class Bucket {

    private s3: AWSS3;

    constructor(private config: BucketConfig) {
        this.s3 = new AWSS3({ region: this.config.region });
    }

    public async listObjects(): Promise<string[]> {
        const res = await this.s3.listObjects({ Bucket: this.config.bucket });

        if (res.$metadata.httpStatusCode === 200 && res.Contents) {
            return res.Contents.map(x => x.Key).filter(x => x !== undefined) as string[];
        }

        throw new Error(`Unexpected error while listing objects: ${JSON.stringify(res, null, 2)}`);
    }

    public async delete(): Promise<void> {
        console.info(`Deleting bucket ${this.config.bucket}`);

        const objects = await this.listObjects();

        if (objects.length > 0) {
            await Promise.all(objects.map(x => this.deleteObject(x)));
        }

        const res = await this.s3.deleteBucket({ Bucket: this.config.bucket });

        if (res.$metadata.httpStatusCode !== 204) {
            throw new Error(`Unexpected error while deleting bucket: ${JSON.stringify(res, null, 2)}`);
        }
    }

    public async uploadObjectData(key: string, body: string | Buffer | Uint8Array | ReadableStream | Blob): Promise<void> {
        console.info(`Uploading blob ${key}`);

        const res = await this.s3.putObject({
            Bucket: this.config.bucket,
            Key: key,
            Body: body
        });

        if (res.$metadata.httpStatusCode === 200) {
            console.info(`Uploaded blob ${key}`);
            return;
        }

        throw new Error(`Unexpected error while uploading blob: ${JSON.stringify(res, null, 2)}`);
    }

    public async uploadObjectFile(key: string, path: string): Promise<void> {
        console.info(`Uploading file ${key}`);

        const readStream = fs.createReadStream(path);

        const res = await this.s3.putObject({
            Bucket: this.config.bucket,
            Key: key,
            Body: readStream
        });

        if (res.$metadata.httpStatusCode === 200) {
            console.info(`Uploaded file ${key}`);
            return;
        }

        throw new Error(`Unexpected error while uploading blob: ${JSON.stringify(res, null, 2)}`);
    }

    public async downloadObjectData(key: string): Promise<Uint8Array> {
        console.info(`Downloading blob ${key}`);

        const res = await this.s3.getObject({
            Bucket: this.config.bucket,
            Key: key
        });

        if (res.$metadata.httpStatusCode === 200) {

            if (!(res.Body instanceof Readable)) {
                throw Error("Unexpected error while downloading blob: Body is not a readable stream");
            }

            console.info(`Downloaded blob ${key}`);
            return await res.Body.transformToByteArray();
        }

        throw Error(`Unexpected error while downloading blob: ${JSON.stringify(res, null, 2)}`);
    }

    public async downloadObjectFile(key: string, path:string) {
        console.info(`Downloading file ${key}`);

        const res = await this.s3.getObject({
            Bucket: this.config.bucket,
            Key: key
        });

        if (res.$metadata.httpStatusCode === 200) {
            return new Promise<void>((resolve, reject) => {
                if (!(res.Body instanceof Readable)) {
                    reject(Error("Unexpected error while downloading blob: Body is not a readable stream"));
                    return;
                }

                const writeStream = fs.createWriteStream(path);
                res.Body.pipe(writeStream)
                    .on("error", (err) => {
                        reject(err);
                    })
                    .on("finish", () => {
                        console.info(`Downloaded file ${key}`);
                        resolve();
                    });
            });
        }

        throw Error(`Unexpected error while downloading blob: ${JSON.stringify(res, null, 2)}`);
    }

    public async deleteObject(key: string): Promise<void> {
        console.info(`Deleting blob ${key}`);

        const res = await this.s3.deleteObject({
            Bucket: this.config.bucket,
            Key: key
        });

        if (res.$metadata.httpStatusCode === 204) {
            console.info(`Deleted blob ${key}`);
            return;
        }

        throw new Error(`Unexpected error while deleting blob: ${JSON.stringify(res, null, 2)}`);
    }

    public async existsObject(key: string): Promise<boolean> {
        const res = await this.s3.headObject({
            Bucket: this.config.bucket,
            Key: key
        });

        if (res.$metadata.httpStatusCode === 404) {
            return false;
        }

        if (res.$metadata.httpStatusCode === 200) {
            return true;
        }

        throw new Error(`Unexpected error while checking if blob exists: ${JSON.stringify(res, null, 2)}`);
    }
}