import type { DynamicCollection } from "@multiverse/core/src/Collection/Collection";
import type {
    Collection, LabeledVector, Vector
} from "@multiverse/core/src/Collection/Collection";
import { HierarchicalNSW } from "hnswlib-node";

export default class KNN {

    private index: Promise<HierarchicalNSW>;
    private lastTimeUpdatedTimestamp: number;

    constructor(private options: {
        collection: Collection | DynamicCollection
    }) {
        this.index = this.initializeIndex();
        this.lastTimeUpdatedTimestamp = Date.now();
    }

    public collection() {
        return this.options.collection;
    }

    private async initializeIndex() {
        const dimensions = await this.options.collection.dimensions();
        const index = new HierarchicalNSW("l2", dimensions);
        const size = await this.options.collection.size();

        let maxSize = size;

        if ("add" in this.options.collection) {
            maxSize = Math.max(size * 2, 10000);
        }

        index.initIndex(maxSize);

        console.info(`Initializing index with ${dimensions} dimensions and ${maxSize} max size`);

        this.lastTimeUpdatedTimestamp = Date.now();

        const stream = await this.options.collection.readStream();

        for await (const vector of stream) {
            index.addPoint(vector.vector, vector.label);
        }

        console.info(`Index initialized with ${index.getCurrentCount()} vectors`);

        return index;
    }

    public async search(query: Vector, numNeighbors: number) {
        const index = await this.index;
        return index.searchKnn(query, numNeighbors);
    }

    public lastTimeUpdated() {
        return this.lastTimeUpdatedTimestamp;
    }

    public async update(changes: (LabeledVector & {deactivated?: true})[]) {
        const index = await this.index;
        // TODO: potentional bug - what if the vector is already there (but deactivated?)
        changes.forEach(change => {
            if (change.deactivated) {
                index.markDelete(change.label);
            } else {
                index.addPoint(change.vector, change.label);
            }
        });

        this.lastTimeUpdatedTimestamp = Date.now();
    }

    // public async add(vectors: LabeledVector[]) {
    //     const index = await this.index;
    //     vectors.forEach(v => index.addPoint(v.vector, v.label));
    // }

    // public async remove(labels: number[]) {
    //     const index = await this.index;
    //     labels.forEach(l => index.markDelete(l));
    // }
}