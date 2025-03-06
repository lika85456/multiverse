/* eslint-disable max-len */
import type Index from ".";
import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";
import type { Query, SearchResultVector } from "../core/Query";
import type { NewVector } from "../core/Vector";
import { readFile, writeFile } from "fs/promises";
import logger from "@multiverse/log";

const log = logger.getSubLogger({ name: "LocalIndex" });

export default class LocalIndex implements Index {

    private storedVectors: NewVector[] = [];

    constructor(private options: DatabaseConfiguration) {
    }

    //l2: sum((x_i - y_i)^2), ip: 1 - sum(x_i * y_i), cosine: 1 - sum(x_i * y_i) / norm(x) * norm(y)
    public async knn(query: Query): Promise<SearchResultVector[]> {
        if (this.storedVectors.length === 0) {
            return [];
        }

        if (this.options.space === "cosine") {
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

        if (this.options.space === "ip") {
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

    public async count(): Promise<number> {
        return Promise.resolve(this.storedVectors.length);
    }

    public async physicalSize(): Promise<number> {
        return Promise.resolve(JSON.stringify(this.storedVectors).length);
    }

    public async dimensions(): Promise<number> {
        return Promise.resolve(this.options.dimensions);
    }

    public async save(path: string): Promise<void> {
        // create file in path
        const contents = JSON.stringify(this.storedVectors);

        // save
        await writeFile(path, contents);

        log.debug("Saved index", {
            path,
            vectors: this.storedVectors.length
        });
    }

    public async load(path: string): Promise<void> {
        // read file
        const contents = await readFile(path, "utf-8");

        // parse
        this.storedVectors = JSON.parse(contents);

        log.debug("Loaded index", {
            path,
            vectors: this.storedVectors.length
        });
    }

}