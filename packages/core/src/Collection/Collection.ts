import type { Dataset, File } from "h5wasm";
import h5wasm from "h5wasm";

const COLLECTION_TEMP_PATH = "/tmp/collections";

export default class Collection {

    private file: File;
    private initializePromise: Promise<void>;

    constructor(
        public author: string,
        public name: string,
        public vectors: number,
        public dimensions: number,
        public downloadPath: string,
    ) {
        this.initializePromise = this.initialize();
    }

    private async initialize() {
        await h5wasm.ready;
        this.file = new h5wasm.File(this.persistentPath(), "r");
    }

    public async next() {
        await this.initializePromise;

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