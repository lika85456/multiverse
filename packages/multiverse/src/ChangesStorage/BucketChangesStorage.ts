import { S3 } from "@aws-sdk/client-s3";
import type ChangesStorage from ".";
import type { AwsToken } from "../core/AwsToken";
import type { StoredVectorChange } from "./StoredVector";

export default class BucketChangesStorage implements ChangesStorage {

    private s3: S3;

    constructor(public name: string, private options: {
        region: string;
        awsToken: AwsToken;
        maxObjectAge: number;
    }) {
        this.s3 = new S3({
            region: this.options.region,
            credentials: this.options.awsToken
        });
    }

    private async encode(data: StoredVectorChange[]): Promise<Buffer> {
        return Buffer.from(JSON.stringify(data) + "\n");
    }

    private async decode(data: Buffer): Promise<StoredVectorChange[]> {
        // return JSON.parse(data.toString());
        const arrays = data.toString().split("\n");
        arrays.pop();

        return arrays.map(array => JSON.parse(array)).flat();
    }

    public async add(changes: StoredVectorChange[]): Promise<{ unprocessedItems: string[]; }> {

        const objects = await this.s3.listObjectsV2({ Bucket: this.name });
        const latestObject = objects.Contents?.sort((a, b) => {
            return parseInt(a.Key?.split(".")[0].slice(0, -4) ?? "0") - parseInt(b.Key?.split(".")[0].slice(0, -4) ?? "0");
        }).pop();

        if (!latestObject) {
            await this.s3.putObject({
                Bucket: this.name,
                Key: `${Date.now()}${Math.random().toString().slice(2, 4)}.json`,
                Body: await this.encode(changes),
                ContentType: "application/json",
                Metadata: { changes_count: changes.length.toString() }
            });
        } else {
            const latestObjectHead = await this.s3.headObject({
                Bucket: this.name,
                Key: latestObject.Key
            });

            if (!latestObjectHead || !latestObjectHead.Metadata) {
                throw new Error("Could not get metadata of the latest object");
            }

            await this.s3.putObject({
                Bucket: this.name,
                Key: latestObject.Key,
                Body: await this.encode(changes),
                ContentType: "application/json",
                Metadata: { changes_count: changes.length.toString() + parseInt(latestObjectHead.Metadata.changes_count ?? "0") },
                WriteOffsetBytes: latestObjectHead.ContentLength
            });
        }

        return { unprocessedItems: [] };
    }

    public async *changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown> {
        // list all objects and then filter by timestamp
        const objects = await this.s3.listObjectsV2({ Bucket: this.name });
        const filteredObjects = objects.Contents?.filter(object => {
            return object.Key && parseInt(object.Key.split(".")[0].slice(0, -4)) >= timestamp;
        });

        if (!filteredObjects) {
            return;
        }

        for (const object of filteredObjects) {
            const data = await this.s3.getObject({
                Bucket: this.name,
                Key: object.Key
            });
            const changes = (await this.decode(Buffer.from(await data.Body?.transformToString() ?? "[]")))
                .filter(change => change.timestamp >= timestamp);

            for (const change of changes) {
                yield change;
            }
        }
    }

    public async getAllChangesAfter(timestamp: number): Promise<StoredVectorChange[]> {
        const objects = await this.s3.listObjectsV2({ Bucket: this.name });
        const filteredObjects = objects.Contents?.filter(object => {
            return object.Key && parseInt(object.Key.split(".")[0].slice(0, -4)) >= timestamp;
        });

        if (!filteredObjects) {
            return [];
        }

        const changes: StoredVectorChange[] = [];

        for (const object of filteredObjects) {
            const data = await this.s3.getObject({
                Bucket: this.name,
                Key: object.Key
            });
            const objectChanges = (await this.decode(Buffer.from(await data.Body?.transformToString() ?? "[]")))
                .filter(change => change.timestamp >= timestamp);

            changes.push(...objectChanges);
        }

        return changes;
    }

    public async clearBefore(timestamp: number): Promise<void> {
        // list all objects and then filter by timestamp
        const objects = await this.s3.listObjectsV2({ Bucket: this.name });
        const filteredObjects = objects.Contents?.filter(object => {
            return object.Key && parseInt(object.Key.split(".")[0].slice(0, -4)) < timestamp;
        });

        if (!filteredObjects) {
            return;
        }

        await Promise.all(filteredObjects.map(async object => {
            await this.s3.deleteObject({
                Bucket: this.name,
                Key: object.Key
            });
        }));
    }

    public async count(): Promise<number> {
        // list all objects and their metadata
        const objects = await this.s3.listObjectsV2({ Bucket: this.name });

        if (!objects.Contents) {
            return 0;
        }

        const metadata = await Promise.all(objects.Contents.map(async object => {
            const data = await this.s3.headObject({
                Bucket: this.name,
                Key: object.Key
            });

            return parseInt(data.Metadata?.changes_count ?? "0");
        }));

        return metadata.reduce((acc, val) => acc + val, 0);
    }

    public async deploy(): Promise<void> {
        // todo deploy S3 Express One Zone
        await this.s3.createBucket({
            Bucket: this.name,
            CreateBucketConfiguration: { Bucket: { Type: "Directory" } }
        });
    }

    public async destroy(): Promise<void> {
        await this.clearBefore(Date.now() + 10000000);
        await this.s3.deleteBucket({ Bucket: this.name });
    }

    public getResourceName(): string {
        return this.name;
    }

}