import { HierarchicalNSW, } from "hnswlib-node";
import type Index from ".";
import type { Query, SearchResultVector } from "../Database/Query";
import crypto from "crypto";
import type { NewVector } from "../Vector";
import {
    mkdir, readFile, writeFile
} from "fs/promises";
import adm from "adm-zip";
import logger from "@multiverse/log";

const log = logger.getSubLogger({ name: "HNSWIndex" });

export default class HNSWIndex implements Index {

    private index: HierarchicalNSW;
    private idMap: {[id: number]: string} = {};
    private metadata: {[id: number]: Record<string, string>} = {};

    constructor(private options: {
        dimensions: number;
        spaceName: "l2" | "ip" | "cosine";
        size: number;
    }) {
        this.index = this.initializeIndex();
    }

    private initializeIndex() {
        log.debug("Initializing index");
        const index = new HierarchicalNSW(this.options.spaceName, this.options.dimensions);
        index.initIndex(this.options.size * 2, undefined, undefined, undefined, true);

        return index;
    }

    private hashLabel(label: string) {
        const hash = crypto.createHash("sha1").update(label).digest("hex");
        const id = parseInt(hash.slice(0, 8), 16);

        return id;
    }

    public async knn(query: Query): Promise<SearchResultVector[]> {
        log.debug("Querying", { query });

        const result = this.index.searchKnn(query.vector.toArray(), query.k);

        const results: SearchResultVector[] = [];

        for (let i = 0; i < result.distances.length; i++) {
            const id = result.neighbors[i];
            const label = this.idMap[id];

            if (!label) {
                throw new Error("Failed to find label for id");
            }

            results.push({
                distance: result.distances[i],
                label,
                metadata: this.metadata[id],
                vector: this.index.getPoint(id)
            });
        }

        return results;
    }

    public async add(vectors: NewVector[]): Promise<void> {
        const index = this.index;
        vectors.forEach(vector => {

            const id = this.hashLabel(vector.label);

            this.idMap[id] = vector.label;

            if (vector.metadata)
                this.metadata[id] = vector.metadata;

            index.addPoint(vector.vector.toArray(), id, true);

            log.debug("Added vector", {
                vector,
                id
            });
        });

        if (index.getCurrentCount() >= index.getMaxElements() / 2) {
            index.resizeIndex(index.getMaxElements() * 2);
        }
    }

    public async remove(labels: string[]): Promise<void> {
        const index = this.index;

        labels.forEach(label => {
            const id = this.hashLabel(label);
            delete this.idMap[id];
            index.markDelete(id);

            log.debug("Removed vector", {
                label,
                id
            });
        });
    }

    public async resize(newSize: number) {
        log.debug("Resizing index", {
            newSize,
            oldSize: this.index.getMaxElements()
        });

        const index = this.index;
        index.resizeIndex(newSize);

    }

    private async saveIdMap(path: string) {
        const idMapJson = JSON.stringify(this.idMap);
        await writeFile(path, idMapJson);

        log.debug("Saved id map", { path });
    }

    private async saveMetadata(path: string) {
        const metadataJson = JSON.stringify(this.metadata);
        await writeFile(path, metadataJson);

        log.debug("Saved metadata", { path });
    }

    public async save(path: string) {
        // save three files:
        // 1. index.hnsw
        // 2. idMap.json
        // 3. metadata.json
        // and then zip them into a single file (path)

        const tmpPath = `/tmp/${Math.random().toString(36).slice(2)}`;
        await mkdir(tmpPath);

        // 1. index.hnsw
        await Promise.all([
            this.index.writeIndex(`${tmpPath}/index.hnsw`),
            this.saveIdMap(`${tmpPath}/idMap.json`),
            this.saveMetadata(`${tmpPath}/metadata.json`),
        ]);

        // 2. zip
        const zip = new adm();

        zip.addLocalFolder(tmpPath);
        const buffer = zip.toBuffer();

        await writeFile(path, buffer);

        log.debug("Saved index", { path });
    }

    public async load(path: string) {
        const zip = new adm(path);
        zip.extractAllTo("/tmp", true);

        const index = this.initializeIndex();

        await index.readIndex("/tmp/index.hnsw");

        const idMapJson = await readFile("/tmp/idMap.json");
        const metadataJson = await readFile("/tmp/metadata.json");

        this.idMap = JSON.parse(idMapJson.toString());
        this.metadata = JSON.parse(metadataJson.toString());

        this.index = index;

        log.debug("Loaded index", { path });
    }

    public physicalSize() {
        const index = this.index;

        return index.getCurrentCount();
    }

    public async size() {
        return this.physicalSize();
    }

    public async dimensions() {
        return this.options.dimensions;
    }
}