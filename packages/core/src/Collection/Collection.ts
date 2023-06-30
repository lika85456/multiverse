import S3 from "../aws/s3/S3";
import h5wasm, { Dataset } from 'h5wasm';

const COLLECTION_TEMP_PATH = "/tmp/collections";

export default class Collection {

    private collectionPath: string;

    constructor(
        public id: string,
        public name: string,
        public s3: S3,
        public vectors: number,
        public dimensions: number
    ) {
        this.collectionPath = `${COLLECTION_TEMP_PATH}/${this.id}`;
    }

    public async exists(): Promise<boolean> {
        return await this.s3.exists() && this.s3.existsObject(this.id);
    }

    public async upload(fsPath: string): Promise<void> {
        await this.s3.uploadObjectFile(this.id, fsPath);
    }

    public async read() {
        await h5wasm.ready;
        let f = new h5wasm.File(datasetPath, "r");

        console.log(f.keys());

        const dataset:Dataset = f.get("train");

        console.log(dataset.slice([[1,1],[]]));
    }
};
