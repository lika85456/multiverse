import { S3, waitUntilBucketExists } from "@aws-sdk/client-s3";
import type { Snapshot } from ".";
import type SnapshotStorage from ".";
import { createReadStream, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import type { Readable } from "stream";
import log from "@multiverse/log";
import type { DatabaseID } from "../core/DatabaseConfiguration";
import type { AwsToken } from "../core/AwsToken";
import keepAliveAgent from "../keepAliveAgent";

const logger = log.getSubLogger({ name: "S3SnapshotStorage" });

export class S3SnapshotStorageDeployer {

    private s3: S3;

    constructor(private options: {
            bucketName: string;
            region: string;
            awsToken: AwsToken
        }) {
        this.s3 = new S3({
            region: this.options.region,
            credentials: this.options.awsToken
        });
    }

    public async deploy(): Promise<void> {
        logger.info(`Creating bucket ${this.options.bucketName}`);

        await this.s3.createBucket({
            Bucket: this.options.bucketName,
            // CreateBucketConfiguration: { LocationConstraint: this.options.region },
        });

        await waitUntilBucketExists({
            client: this.s3,
            maxWaitTime: 60,
        }, { Bucket: this.options.bucketName });

        logger.info(`Created bucket ${this.options.bucketName}`);
    }

    public async destroy(): Promise<void> {
        logger.info(`Deleting bucket ${this.options.bucketName}`);

        try {
            await this.s3.deleteBucket({ Bucket: this.options.bucketName });
        } catch (e) {
            // bucket is probably not empty, so empty it

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const objects = await this.s3.listObjectsV2({ Bucket: this.options.bucketName });

                if (!objects.Contents || objects.Contents.length === 0) {
                    break;
                }

                const objectsToDelete = objects.Contents.map(object => ({ Key: object.Key }));

                await this.s3.deleteObjects({
                    Bucket: this.options.bucketName,
                    Delete: { Objects: objectsToDelete }
                });
            }

            await this.s3.deleteBucket({ Bucket: this.options.bucketName });
        } finally {
            logger.info(`Deleted bucket ${this.options.bucketName}`);
        }
    }

    public async exists() {
        try {
            await this.s3.headBucket({ Bucket: this.options.bucketName });

            return true;
        } catch (e) {
            return false;
        }
    }
}

export default class S3SnapshotStorage implements SnapshotStorage {

    private deployer;

    private s3: S3;

    constructor(private options: {
        bucketName: string;
        databaseId: DatabaseID;
        downloadPath?: string;
        awsToken: AwsToken
    }) {
        this.s3 = new S3({
            region: options.databaseId.region,
            credentials: options.awsToken,
            requestHandler: keepAliveAgent
        });
        this.options.downloadPath = this.options.downloadPath || "/tmp/s3-snapshots";
        this.deployer = new S3SnapshotStorageDeployer({
            bucketName: this.options.bucketName,
            region: this.options.databaseId.region,
            awsToken: this.options.awsToken
        });
    }

    public async create(filePath: string, timestamp: number): Promise<Snapshot> {
        const now = Date.now();
        const s3Path = `${this.options.databaseId.name}/${timestamp}.snapshot`;

        logger.debug(`Uploading snapshot to s3://${this.options.bucketName}/${s3Path}`, { filePath });

        await this.s3.putObject({
            Bucket: this.options.bucketName,
            Key: s3Path,
            Body: createReadStream(filePath)
        });

        logger.info(`Uploaded snapshot to s3://${this.options.bucketName}/${s3Path}`, { uploadTime: Date.now() - now, });

        return {
            filePath,
            timestamp,
            databaseName: this.options.databaseId.name
        };
    }

    public async latestWithoutDownload(): Promise<Snapshot | undefined> {
        const s3Objects = await this.s3.listObjectsV2({
            Bucket: this.options.bucketName,
            Prefix: this.options.databaseId.name
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
                databaseName: this.options.databaseId.name
            });
        }

        // sort by timestamp
        snapshots.sort((a, b) => a.timestamp - b.timestamp);

        // download the latest
        const latest = snapshots[snapshots.length - 1];

        return {
            filePath: "",
            timestamp: latest.timestamp,
            databaseName: this.options.databaseId.name
        };
    }

    public async loadLatest(): Promise<Snapshot | undefined> {

        logger.debug(`Loading latest snapshot from s3://${this.options.bucketName}/${this.options.databaseId.name}`);

        const s3Objects = await this.s3.listObjectsV2({
            Bucket: this.options.bucketName,
            Prefix: this.options.databaseId.name
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
                databaseName: this.options.databaseId.name
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
            logger.error(`Failed to download snapshot from s3://${this.options.bucketName}/${latest.filePath} or it is empty`);

            return undefined;
        }

        // create if not exists the folder for the index
        await mkdir(`${this.options.downloadPath}/${this.options.databaseId.name}`, { recursive: true });

        // pipe body to filePath
        await new Promise((resolve, reject) => {
            (s3Object.Body as Readable).pipe(createWriteStream(`${this.options.downloadPath}/${latest.filePath}`))
                .on("finish", resolve)
                .on("error", reject);
        });

        logger.info(`Downloaded snapshot from s3://${this.options.bucketName}/${latest.filePath}`, {
            filePath: `${this.options.downloadPath}/${latest.filePath}`,
            timestamp: latest.timestamp,
            databaseName: this.options.databaseId.name
        });

        return {
            filePath: `${this.options.downloadPath}/${latest.filePath}`,
            timestamp: latest.timestamp,
            databaseName: this.options.databaseId.name
        };
    }

    public async directoryPath(): Promise<string> {
        return `${this.options.downloadPath}/${this.options.databaseId.name}`;
    }

    public async deploy(): Promise<void> {
        await this.deployer.deploy();
    }

    public async destroy(): Promise<void> {
        await this.deployer.destroy();
    }

    public getResourceName() {
        return this.options.bucketName;
    }
}