import { HierarchicalNSW, } from "hnswlib-node";
import type Index from ".";
import type { SearchResultVector, StoredVector } from "../Database/Vector";
import type { Query } from "../Database/VectorDatabase";

export default class HNSWIndex implements Index {

    private index: HierarchicalNSW;

    constructor(private options: {
        dimensions: number;
        spaceName: "l2" | "ip" | "cosine";
        size: number;
    }) {
        this.index = this.initializeIndex();
    }

    private initializeIndex() {
        const index = new HierarchicalNSW(this.options.spaceName, this.options.dimensions);
        index.initIndex(this.options.size * 2, undefined, undefined, undefined, true);
        return index;
    }

    public async knn(query: Query): Promise<SearchResultVector[]> {
        const index = this.index;
        const result = index.searchKnn(query.vector.toArray(), query.k);

        const results: SearchResultVector[] = [];

        for (let i = 0; i < result.distances.length; i++) {
            results.push({
                distance: result.distances[i],
                id: result.neighbors[i]
            });
        }

        return results;
    }

    public async add(vectors: StoredVector[]): Promise<void> {
        const index = this.index;
        vectors.forEach(vector => {
            index.addPoint(vector.vector.toArray(), vector.id, true);
        });

        if (index.getCurrentCount() >= index.getMaxElements() / 2) {
            index.resizeIndex(index.getMaxElements() * 2);
        }
    }

    public async remove(ids: number[]): Promise<void> {
        const index = this.index;
        ids.forEach(id => {
            index.markDelete(id);
        });
    }

    public async resize(newSize: number) {
        const index = this.index;
        index.resizeIndex(newSize);
    }

    public async saveIndex(path: string) {
        const index = this.index;
        const result = await index.writeIndex(path);

        if (!result) {
            throw new Error("Failed to save index");
        }
    }

    public async loadIndex(path: string) {
        const index = this.index;
        const result = await index.readIndex(path, true);

        if (!result) {
            throw new Error("Failed to load index");
        }
    }

    public physicalSize() {
        const index = this.index;
        return index.getCurrentCount();
    }
}