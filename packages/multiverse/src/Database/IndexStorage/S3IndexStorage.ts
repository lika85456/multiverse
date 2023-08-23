import { S3Client, S3 } from "@aws-sdk/client-s3";
import type Index from "../../Index";
import type IndexStorage from "./IndexStorage";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";

export class S3IndexStorage implements IndexStorage {

    private s3: S3;

    constructor(private options: {
        bucket: string;
        region: string;
    }) {
        this.s3 = new S3({ region: options.region });
    }

    async saveIndex(index: Index, name: string): Promise<void> {
        const fileName = `${name}-${Date.now()}-${await index.size()}.index`;

        await index.save(`/tmp/${fileName}`);

        // upload to s3
        const result = await this.s3.putObject({
            Bucket: this.options.bucket,
            Key: fileName,
            Body: createReadStream(`/tmp/${fileName}`)
        });

        if (result.$metadata.httpStatusCode !== 200) {
            throw new Error(`Failed to save index ${name} to s3://${this.options.bucket}/${fileName}`);
        }

        console.debug(`Saved index ${name} to s3://${this.options.bucket}/${fileName}`);

        await unlink(`/tmp/${fileName}`);
    }

    loadIndex(index: Index, name: string): Promise<void> {
        
    }

}