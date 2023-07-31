import type { Collection } from "./Collection";
import { S3 } from "@aws-sdk/client-s3";
import * as fs from "fs";
import { Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";

export class S3Collection implements Collection {

    // collection is stored in a local file as a cache
    private static COLLECTION_PATH = "/tmp/collection.dat";

    constructor(public options: {
        bucket: string;
        name: string;
        region: string;
        dimensions: number;
        vectors: number;
    }) {
    }

    public async readStream(): Promise<Readable> {
        // check if file exists (it consists of JSON stringified objects split by line)
        if (!fs.existsSync(S3Collection.COLLECTION_PATH)) {
            return this.save().then(() => this.readStream());
        }

        const file = fs.createReadStream(S3Collection.COLLECTION_PATH);

        return Promise.resolve(new Readable({
            objectMode: true,
            read() {
                const line = file.read();

                if (line) {
                    this.push(JSON.parse(line.toString()));
                } else {
                    this.push(null);
                }
            }
        }));
    }

    public async upload(readStream: Readable): Promise<void> {
        console.info(`Uploading collection to S3: ${this.options.bucket}/${this.options.name}`);

        const s3 = this.s3();

        const target = {
            Bucket: this.options.bucket,
            Key: this.options.name,
            Body: readStream,
        };

        const parallelUploads3 = new Upload({
            client: s3,
            params: target,
        });

        parallelUploads3.on("httpUploadProgress", (progress) => {
            console.info(`Uploaded ${progress.loaded} bytes of ${progress.total}`);
        });

        await parallelUploads3.done();
    }

    public async delete(): Promise<void> {
        console.info(`Deleting collection from S3: ${this.options.bucket}/${this.options.name}`);

        const s3 = this.s3();

        const params = {
            Bucket: this.options.bucket,
            Key: this.options.name
        };

        await s3.deleteObject(params);
    }

    private s3(): S3 {
        return new S3({ region: this.options.region });
    }

    private async save(): Promise<void> {
        console.info(`Downloading collection from S3: ${this.options.bucket}/${this.options.name}`);

        const file = fs.createWriteStream(S3Collection.COLLECTION_PATH);
        const object = await this.s3().getObject({
            Bucket: this.options.bucket,
            Key: this.options.name
        });

        return new Promise((resolve, reject) => {

            if (!object.Body || !(object.Body instanceof Readable)) {
                reject("Object body is not readable");
                return;
            }

            object.Body.pipe(file);

            file.on("finish", () => {
                resolve();
            });

            file.on("error", (err) => {
                reject(err);
            });
        });
    }
}