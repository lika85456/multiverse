import { S3 } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import fs from "fs";
import * as readline from "node:readline/promises";
import z from "zod";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";

const createPresignedUrlWithClient = ({
    region, bucket, key
}: {
    region: string;
    bucket: string;
    key: string;
}) => {
    const client = new S3Client({ region });
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key
    });

    return getSignedUrl(client as any, command as any, { expiresIn: 3600 });
};

export type CollectionType = "hdf5" | "json";

export class Collections {

    private s3: S3;

    constructor(private options: {
        region: string;
        bucket: string;
    }) {
        this.s3 = new S3({ region: options.region });
    }

    /**
     * Returns reference to a collection (not necessarily existing)
     */
    public collection({
        name, dimensions, type
    }: { name: string; dimensions: number; type: CollectionType }) {
        return new Collection({
            name,
            dimensions,
            region: this.options.region,
            bucket: this.options.bucket,
            type
        });
    }

    public async delete(name: string) {
        const result = await this.s3.deleteObject({
            Bucket: this.options.bucket,
            Key: name
        });

        if (!result.$metadata.httpStatusCode) throw new Error("No http status code in result");
        if (result.$metadata.httpStatusCode !== 204) throw new Error("Unexpected http status code " + result.$metadata.httpStatusCode);
    }
}

const LabeledVectorSchema = z.object({
    label: z.string(),
    vector: z.array(z.number())
});

export type LabeledVector = z.infer<typeof LabeledVectorSchema>;

export class Collection {

    private TEMP_PATH = "/tmp/";
    private s3: S3;

    private readStream?: Readable;
    private reader?: readline.Interface;
    private readerIterator?: AsyncIterableIterator<string>;

    /**
     * @deprecated Use Collections.collection() instead
     */
    constructor(private options: {
        region: string;
        bucket: string;
        name: string;
        dimensions: number;
        type: "hdf5" | "json";
    }) {
        this.s3 = new S3({ region: options.region });
    }

    /**
     * Loads the collection from S3 to temp storage. Does not have to be called explicitly.
     */
    public async load(): Promise<void> {
        const res = await this.s3.getObject({
            Bucket: this.options.bucket,
            Key: this.options.name
        });

        const path = this.TEMP_PATH + this.options.name;

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
                        resolve();
                    });
            });
        }

        throw Error(`Unexpected error while downloading blob: ${JSON.stringify(res, null, 2)}`);
    }

    /**
     * @returns S3 Upload link for the collection
     */
    public async uploadLink(): Promise<string> {

        // check if exists in temp storage
        if (fs.existsSync(this.TEMP_PATH + this.options.name)) {
            throw Error("Collection already exists");
        }

        // check if object exists
        const result = await this.s3.headObject({
            Bucket: this.options.bucket,
            Key: this.options.name
        }).catch(e => e);

        if (result.$metadata.httpStatusCode < 400) {
            throw Error("Collection already exists");
        }

        return createPresignedUrlWithClient({
            region: this.options.region,
            bucket: this.options.bucket,
            key: this.options.name
        });
    }

    public async upload(readStream: ReadableStream): Promise<void> {
        const upload = new Upload({
            client: this.s3,
            params: {
                Bucket: this.options.bucket,
                Key: this.options.name,
                Body: readStream
            },
        });

        await upload.done();
    }

    private async initializeReader() {
        // check if exists in temp storage
        if (!fs.existsSync(this.TEMP_PATH + this.options.name)) {
            await this.load();
        }

        this.readStream = fs.createReadStream(this.TEMP_PATH + this.options.name);

        if (!(this.readStream instanceof Readable)) {
            throw Error("Unexpected error while downloading blob: Body is not a readable stream");
        }

        this.reader = readline.createInterface({
            input: this.readStream,
            crlfDelay: Infinity
        });

        this.readerIterator = this.reader[Symbol.asyncIterator]();
    }

    private async readJSON(): Promise<{
        value: LabeledVector | undefined;
        done: boolean;
    }> {
        const line = await this.readerIterator!.next();

        if (!line || line.done) {
            return {
                done: true,
                value: undefined
            };
        }

        const parsed = LabeledVectorSchema.parse(JSON.parse(line.value));

        return {
            done: false,
            value: {
                label: parsed.label,
                vector: parsed.vector
            }
        };
    }

    private async readHDF5(): Promise<{
        value: LabeledVector | undefined;
        done: boolean;
    }> {
        throw Error("Not implemented");
    }

    public [Symbol.asyncIterator]() {
        return {
            next: async() => {
                if (!this.readStream) {
                    await this.initializeReader();
                }

                if (this.options.type === "json") {
                    return this.readJSON();
                }

                if (this.options.type === "hdf5") {
                    return this.readHDF5();
                }

                throw Error("Unsupported collection type");
            }
        };
    }

    public dimensions(): number {
        return this.options.dimensions;
    }

    public name(): string {
        return this.options.name;
    }

    public cleanup() {
        if (this.readStream) {
            this.readStream.destroy();
            this.readStream = undefined;
        }

        if (this.reader) {
            this.reader.close();
            this.reader = undefined;
        }

        if (this.readerIterator) {
            this.readerIterator = undefined;
        }
    }
}