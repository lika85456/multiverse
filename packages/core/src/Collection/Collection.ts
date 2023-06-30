import type { Dataset } from "h5wasm";
import h5wasm from "h5wasm";

const COLLECTION_TEMP_PATH = "/tmp/collections";

export default class Collection {

    private collectionPath: string;

    constructor(
        public id: string,
        public author: string,
        public name: string,
        public vectors: number,
        public dimensions: number
    ) {
    }

    public async upload(fsPath: string): Promise<void> {
        await this.s3.uploadObjectFile(this.id, fsPath);
    }

    public async read() {
        await h5wasm.ready;
        const f = new h5wasm.File(datasetPath, "r");

        console.log(f.keys());

        const dataset:Dataset = f.get("train");

        console.log(dataset.slice([[1, 1], []]));
    }

    private persistentPath(): string {
        return `${COLLECTION_TEMP_PATH}/${this.id}`;
    }

    private bucketId(): string {
        return `${this.author}/${this.name}`;
    }
};