import { S3 } from "@aws-sdk/client-s3";
import type { Snapshot } from ".";
import type SnapshotStorage from ".";
import { createReadStream, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import type { Readable } from "stream";

export class S3SnapshotStorageDeployer {

    private s3: S3;

    constructor(private options: {
            bucketName: string;
            region: string;
        }) {
        this.s3 = new S3({ region: this.options.region });
    }

    public async deploy(): Promise<void> {
        await this.s3.createBucket({
            Bucket: this.options.bucketName,
            // CreateBucketConfiguration: { LocationConstraint: this.options.region },
        });
    }

    public async destroy(): Promise<void> {
        // this won't work because the bucket is not empty
        await this.s3.deleteBucket({ Bucket: this.options.bucketName });

        // so we have to delete all objects first
    }
}

export default class S3SnapshotStorage implements SnapshotStorage {

    private s3: S3;

    constructor(private options: {
        bucketName: string;
        region: string;
        indexName: string;
        downloadPath?: string;
    }) {
        this.s3 = new S3({ region: options.region });
        this.options.downloadPath = this.options.downloadPath || "/tmp/s3-snapshots";
    }

    public async create(filePath: string): Promise<Snapshot> {
        const now = Date.now();
        const s3Path = `${this.options.indexName}/${now}.snapshot`;

        await this.s3.putObject({
            Bucket: this.options.bucketName,
            Key: s3Path,
            Body: createReadStream(filePath)
        });

        return {
            filePath,
            timestamp: now,
            indexName: this.options.indexName
        };
    }

    public async loadLatest(): Promise<Snapshot | undefined> {
        const s3Objects = await this.s3.listObjectsV2({
            Bucket: this.options.bucketName,
            Prefix: this.options.indexName
        });

        if (!s3Objects.Contents || s3Objects.Contents.length === 0) {
            return undefined;
        }

        const snapshots: Snapshot[] = [];

        for (const s3Object of s3Objects.Contents) {
            const filePath = s3Object.Key;

            if (!filePath) {
                continue;
            }

            const timestamp = filePath.split("/")[1].split(".")[0];

            snapshots.push({
                filePath,
                timestamp: +timestamp,
                indexName: this.options.indexName
            });
        }

        // sort by timestamp
        snapshots.sort((a, b) => a.timestamp - b.timestamp);

        // download the latest
        const latest = snapshots[snapshots.length - 1];

        const s3Object = await this.s3.getObject({
            Bucket: this.options.bucketName,
            Key: latest.filePath
        });

        if (!s3Object.Body) {
            return undefined;
        }

        // create if not exists the folder for the index
        await mkdir(`${this.options.downloadPath}/${this.options.indexName}`, { recursive: true });

        // pipe body to filePath
        await new Promise((resolve, reject) => {
            (s3Object.Body as Readable).pipe(createWriteStream(`${this.options.downloadPath}/${latest.filePath}`))
                .on("finish", resolve)
                .on("error", reject);
        });

        return {
            filePath: `${this.options.downloadPath}/${latest.filePath}`,
            timestamp: latest.timestamp,
            indexName: this.options.indexName
        };
    }

}