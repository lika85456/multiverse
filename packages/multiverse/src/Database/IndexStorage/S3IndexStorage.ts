import { S3 } from "@aws-sdk/client-s3";
import type Index from "../../Index";
import type { IndexIdentifier } from "./IndexStorage";
import IndexStorage from "./IndexStorage";
import {
    createReadStream, createWriteStream, mkdirSync
} from "fs";
import { unlink } from "fs/promises";
import path from "path";
import type { Readable } from "stream";

export class S3IndexStorage extends IndexStorage {

    private s3: S3;

    constructor(private options: {
        bucket: string;
        region: string;
    }) {
        super();

        this.s3 = new S3({ region: options.region });

        // create folders if they don't exist
        mkdirSync("/tmp/s3-index-uploads", { recursive: true });
        mkdirSync("/tmp/s3-index-downloads", { recursive: true });
    }

    async saveIndex(index: Index, name: string): Promise<void> {

        const fileName = this.nameFromIdentifier({
            name,
            size: await index.size(),
            timestamp: Date.now()
        });

        const filePath = path.join("/tmp/s3-index-uploads", fileName);

        // save to tmp
        await index.save(filePath);

        // upload to s3
        const result = await this.s3.putObject({
            Bucket: this.options.bucket,
            Key: fileName,
            Body: createReadStream(filePath)
        });

        if (result.$metadata.httpStatusCode !== 200) {
            throw new Error(`Failed to save index ${name} to s3://${this.options.bucket}/${fileName}`);
        }

        console.debug(`Saved index ${name} to s3://${this.options.bucket}/${fileName}`);

        await unlink(filePath);
    }

    async loadIndex(index: Index, name: IndexIdentifier): Promise<void> {
        const fileName = this.nameFromIdentifier(name);

        const filePath = path.join("/tmp/s3-index-downloads", fileName);

        // download from s3
        const result = await this.s3.getObject({
            Bucket: this.options.bucket,
            Key: fileName
        });

        if (result.$metadata.httpStatusCode !== 200) {
            throw new Error(`Failed to load index ${name} from s3://${this.options.bucket}/${fileName}`);
        }

        // pipe body to filePath
        await new Promise((resolve, reject) => {
            (result.Body as Readable).pipe(createWriteStream(filePath))
                .on("finish", resolve)
                .on("error", reject);
        });

        // load index from filePath
        await index.load(filePath);

        await unlink(filePath);
    }

    async findLatestIndexSave(name: string): Promise<IndexIdentifier> {
        const files = (await this.s3.listObjectsV2({
            Bucket: this.options.bucket,
            Prefix: name
        })).Contents
            ?.map(file => {
                if (!file.Key) {
                    throw new Error("File key is undefined");
                }

                return this.identifierFromName(file.Key);
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        if (!files) {
            throw new Error(`Failed to find latest index save for ${name}`);
        }

        return files[0];
    }

    async clean(name?: string): Promise<void> {
        const files = (await this.s3.listObjectsV2({
            Bucket: this.options.bucket,
            Prefix: name ?? ""
        })).Contents;

        if (!files) {
            throw new Error(`Failed to find files for ${name}`);
        }

        for await (const file of files) {
            if (!file.Key) {
                throw new Error("File key is undefined");
            }
            await this.s3.deleteObject({
                Bucket: this.options.bucket,
                Key: file.Key
            });
        }
    }

}