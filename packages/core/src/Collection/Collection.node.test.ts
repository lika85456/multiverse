import { readFileSync } from "fs";
import Collection from "./Collection";
import h5wasm, { Dataset } from 'h5wasm';

const datasetPath = "packages/core/src/Collection/mnist-784-euclidean.hdf5";

describe('<Collection>', () => {
    it('should not exist', async () => {

    });

    it('should read hdf5', async () => {
        await h5wasm.ready;
        let f = new h5wasm.File(datasetPath, "r");

        console.log(f.keys());

        const dataset:Dataset = f.get("train");

        console.log(dataset.slice([[1,2],[]]));
    });
});