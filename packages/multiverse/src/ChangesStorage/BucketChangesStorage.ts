import { S3 } from "@aws-sdk/client-s3";
import type ChangesStorage from ".";
import type { AwsToken } from "../core/AwsToken";
import type { StoredVectorChange } from "./StoredVector";
import log from "@multiverse/log";

export default class BucketChangesStorage implements ChangesStorage {

    private s3: S3;

    constructor(public name: string, private options: {
        region: string;
        awsToken: AwsToken;
        maxObjectAge: number;
    }) {
        this.s3 = new S3({
            // region: this.options.region,
            region: "eu-west-1",
            credentials: this.options.awsToken,
            maxAttempts: 3,
            // logger: log.getSubLogger({ name: "BucketChangesStorage" }),
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

    public async add(changes: StoredVectorChange[], tries = 0, forceNewObject = false): Promise<{ unprocessedItems: string[]; }> {
        log.info(`Adding ${changes.length} changes to the storage`);
        const objects = await this.s3.listObjectsV2({ Bucket: this.getBucketName() });
        const latestObject = objects.Contents?.sort((a, b) => {
            return parseInt(a.Key?.split(".")[0].slice(0, -4) ?? "0") - parseInt(b.Key?.split(".")[0].slice(0, -4) ?? "0");
        }).pop();

        if (!latestObject || forceNewObject) {
            log.info("Pushing changes to a new object");
            await this.s3.putObject({
                Bucket: this.getBucketName(),
                Key: `${Date.now()}${Math.random().toString().slice(2, 4)}.json`,
                Body: await this.encode(changes),
                ContentType: "application/json",
                Metadata: { changes_count: changes.length.toString() }
            });
        } else {
            log.info("Pushing more changes to the latest object");
            const latestObjectHead = await this.s3.headObject({
                Bucket: this.getBucketName(),
                Key: latestObject.Key
            });

            if (!latestObjectHead || !latestObjectHead.Metadata) {
                throw new Error("Could not get metadata of the latest object");
            }

            try {
                await this.s3.putObject({
                    Bucket: this.getBucketName(),
                    Key: latestObject.Key,
                    Body: await this.encode(changes),
                    ContentType: "application/json",
                    // Metadata: { changes_count: changes.length.toString() + parseInt(latestObjectHead.Metadata.changes_count ?? "0") },
                    WriteOffsetBytes: latestObjectHead.ContentLength,
                });
            } catch (e) {
                log.error(`Error trying to append to the latest object ${latestObject.Key}: ${e}. object content length: ${latestObjectHead.ContentLength}. Trying again`);
                // trying again
                if (tries < 3) {
                    await new Promise(resolve => setTimeout(resolve, 50));

                    return this.add(changes, tries + 1);
                }
                log.error("Max tries reached");

                // force new object
                return this.add(changes, 0, true);
            }

        }

        log.info("Changes added");

        return { unprocessedItems: [] };
    }

    public async *changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown> {
        // list all objects and then filter by timestamp
        log.debug("Getting changes after timestamp: ", timestamp);
        const objects = await this.s3.listObjectsV2({ Bucket: this.getBucketName() });
        const filteredObjects = objects.Contents?.filter(object => {
            return object.Key && parseInt(object.Key.split(".")[0].slice(0, -4)) >= timestamp;
        });

        if (!filteredObjects) {
            log.debug("No objects found");

            return;
        }

        for (const object of filteredObjects) {
            log.debug("Getting changes from object: ", object.Key);
            const data = await this.s3.getObject({
                Bucket: this.getBucketName(),
                Key: object.Key
            });

            log.debug("Downloading body");
            log.debug("Result, ", data);
            const body = await data.Body?.transformToByteArray();

            log.debug("Decoding and parsing content");
            const changes = (await this.decode(Buffer.from(body!)))
                .filter(change => change.timestamp >= timestamp);

            log.debug("Yielding changes");
            for (const change of changes) {
                yield change;
            }
        }

        log.debug("No more changes found");
    }

    public async getAllChangesAfter(timestamp: number): Promise<StoredVectorChange[]> {
        const objects = await this.s3.listObjectsV2({ Bucket: this.getBucketName() });
        const filteredObjects = objects.Contents?.filter(object => {
            return object.Key && parseInt(object.Key.split(".")[0].slice(0, -4)) >= timestamp;
        });

        if (!filteredObjects) {
            return [];
        }

        const changes: StoredVectorChange[] = [];

        for (const object of filteredObjects) {
            const data = await this.s3.getObject({
                Bucket: this.getBucketName(),
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
        const objects = await this.s3.listObjectsV2({ Bucket: this.getBucketName() });
        const filteredObjects = objects.Contents?.filter(object => {
            return object.Key && parseInt(object.Key.split(".")[0].slice(0, -4)) < timestamp;
        });

        if (!filteredObjects) {
            return;
        }

        await Promise.all(filteredObjects.map(async object => {
            await this.s3.deleteObject({
                Bucket: this.getBucketName(),
                Key: object.Key
            });
        }));
    }

    public async deploy(): Promise<void> {
        const zone = "euw1-az1";

        try {
            log.info("Creating changes bucket");
            const result = await this.s3.createBucket({
                Bucket: `${this.name}--${zone}--x-s3`,
                CreateBucketConfiguration: {
                    Location: {
                        Type: "AvailabilityZone",
                        Name: zone
                    },
                    Bucket: {
                        Type: "Directory",
                        DataRedundancy: "SingleAvailabilityZone"
                    }
                }
            });

            // wait for the bucket to be created
            await new Promise(resolve => setTimeout(resolve, 1000));

            log.info("Changes bucket created: ", result);
        } catch (error) {
            log.error("Error creating changes bucket: ", error);
            throw error;
        }
    }

    public async destroy(): Promise<void> {
        log.info("Destroying changes bucket");
        await this.clearBefore(Date.now() + 10000000);
        await this.s3.deleteBucket({ Bucket: this.getBucketName() });
    }

    private getBucketName(): string {
        return `${this.name}--euw1-az1--x-s3`;
    }

    public getResourceName(): string {
        return this.name;
    }

}