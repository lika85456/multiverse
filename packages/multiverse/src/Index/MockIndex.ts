/* eslint-disable max-len */
import type { SpaceName } from "hnswlib-node";
import type Index from ".";
import type { Query, SearchResultVector } from "../core/Query";
import type { NewVector } from "../core/Vector";
import { readFile, writeFile } from "fs/promises";

export default class MockIndex implements Index {

    private storedVectors: NewVector[] = [];

    constructor(private options: {
        dimensionsCount: number;
        spaceType: SpaceName;
    }) {
    }

    //l2: sum((x_i - y_i)^2), ip: 1 - sum(x_i * y_i), cosine: 1 - sum(x_i * y_i) / norm(x) * norm(y)
    public async knn(query: Query): Promise<SearchResultVector[]> {
        if (this.storedVectors.length === 0) {
            return [];
        }

        if (this.options.spaceType === "cosine") {
            // @ts-ignore
            return this.storedVectors.map((vector) => {
                return {
                    label: vector.label,
                    metadata: vector.metadata,
                    vector: query.sendVector ? vector.vector : undefined,
                    distance: 1 - vector.vector.reduce((acc, value, index) => acc + value * query.vector[index], 0) / Math.sqrt(vector.vector.reduce((acc, value) => acc + value * value, 0) * query.vector.reduce((acc, value) => acc + value * value, 0))
                };
            }).sort((a, b) => a.distance - b.distance).slice(0, query.k);
        }

        if (this.options.spaceType === "ip") {
            // @ts-ignore
            return this.storedVectors.map((vector) => {
                return {
                    label: vector.label,
                    metadata: vector.metadata,
                    vector: query.sendVector ? vector.vector : undefined,
                    distance: 1 - vector.vector.reduce((acc, value, index) => acc + value * query.vector[index], 0)
                };
            }).sort((a, b) => a.distance - b.distance).slice(0, query.k);
        }

        // @ts-ignore
        return this.storedVectors.map((vector) => {
            return {
                label: vector.label,
                metadata: vector.metadata,
                vector: query.sendVector ? vector.vector : undefined,
                distance: vector.vector.reduce((acc, value, index) => acc + Math.pow(value - query.vector[index], 2), 0)
            };
        }).sort((a, b) => a.distance - b.distance).slice(0, query.k);
    }

    public async add(vectors: NewVector[]): Promise<void> {
        // filter out existing labels
        this.storedVectors = this.storedVectors.filter((storedVector) => !vectors.some((vector) => vector.label === storedVector.label));
        this.storedVectors.push(...vectors);
    }

    public async remove(labels: string[]): Promise<void> {
        this.storedVectors = this.storedVectors.filter((vector) => !labels.includes(vector.label));
    }

    public async size(): Promise<number> {
        return Promise.resolve(this.storedVectors.length);
    }

    public async dimensions(): Promise<number> {
        return Promise.resolve(this.options.dimensionsCount);
    }

    public async save(path: string): Promise<void> {
        // create file in path
        const contents = JSON.stringify(this.storedVectors);

        // save
        await writeFile(path, contents);
    }

    public async load(path: string): Promise<void> {
        // read file
        const contents = await readFile(path, "utf-8");

        // parse
        this.storedVectors = JSON.parse(contents);
    }

}