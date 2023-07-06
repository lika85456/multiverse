import { readFileSync } from "fs";
import Collection from "./Collection";
import type { Dataset } from "h5wasm";
import h5wasm from "h5wasm";

// const datasetPath = "packages/core/src/Collection/mnist-784-euclidean.hdf5";
const datasetPath = "packages/core/src/Collection/test.hdf5";

describe("<Collection>", () => {
    it("should not exist", async() => {
        expect(true);
    });

    // it("should read hdf5", async() => {
    //     await h5wasm.ready;
    //     const f = new h5wasm.File(datasetPath, "r");

    //     console.log(f.keys());

    //     const dataset:Dataset = f.get("train");

    //     console.log(dataset.slice([[1, 2], []]));
    // });
});