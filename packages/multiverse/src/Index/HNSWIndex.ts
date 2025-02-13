import { HierarchicalNSW } from "hnswlib-node";
import type Index from ".";
import type { Query, SearchResultVector } from "../core/Query";
import crypto from "crypto";
import type { NewVector } from "../core/Vector";
import {
    mkdir, readFile, writeFile
} from "fs/promises";
import adm from "adm-zip";
import logger from "@multiverse/log";
import type { DatabaseConfiguration } from "../core/DatabaseConfiguration";

const log = logger.getSubLogger({ name: "HNSWIndex" });

export default class HNSWIndex implements Index {

    private index: HierarchicalNSW;
    private idMap: {[id: number]: string} = {};
    private metadata: {[id: number]: Record<string, string>} = {};

    constructor(private config: DatabaseConfiguration, options?: {
        initialSize?: number
    }) {
        this.index = this.initializeIndex(options?.initialSize);
    }

    private initializeIndex(size = 1000) {
        log.debug("Initializing  HNSW index");
        const start = Date.now();

        const index = new HierarchicalNSW(this.config.space, this.config.dimensions);
        index.initIndex(size, undefined, undefined, undefined, true);

        const end = Date.now();

        log.debug("Initialized HNSW index", {
            time: end - start,
            size
        });

        return index;
    }

    private hashLabel(label: string) {
        const hash = crypto.createHash("sha1").update(label).digest("hex");
        const id = parseInt(hash.slice(0, 8), 16);

        return id;
    }

    public async knn(query: Omit<Query, "sendVector">): Promise<SearchResultVector[]> {

        const result = this.index.searchKnn(query.vector, query.k);

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

        // log.debug("Querying", {
        //     query,
        //     results
        // });

        return results;
    }

    public async add(vectors: NewVector[]): Promise<void> {
        const index = this.index;

        for (let i = 0; i < vectors.length; i++) {
            const vector = vectors[i];
            const id = this.hashLabel(vector.label);

            this.idMap[id] = vector.label;

            if (vector.metadata)
                this.metadata[id] = vector.metadata;

            index.addPoint(vector.vector, id, true);

            if (index.getCurrentCount() >= index.getMaxElements() / 2) {
                this.resize(index.getMaxElements() * 2);
            }
        }
    }

    public async remove(labels: string[]): Promise<void> {
        const index = this.index;

        labels.forEach(label => {
            const id = this.hashLabel(label);
            delete this.idMap[id];
            delete this.metadata[id];
            index.markDelete(id);
        });
    }

    public async resize(newSize: number) {

        const start = Date.now();

        const index = this.index;
        index.resizeIndex(newSize);

        const end = Date.now();

        log.debug("Resized index", {
            newSize,
            oldSize: this.index.getMaxElements(),
            time: end - start
        });
    }

    private async saveIdMap(path: string) {
        const idMapJson = JSON.stringify(this.idMap);
        await writeFile(path, idMapJson);

        log.debug("Saved id map", {
            path,
            contentLength: idMapJson.length
        });
    }

    private async saveMetadata(path: string) {
        const metadataJson = JSON.stringify(this.metadata);
        await writeFile(path, metadataJson);

        log.debug("Saved metadata", {
            path,
            contentLength: metadataJson.length
        });
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

        await writeFile(path, new Uint8Array(buffer));

        log.debug("Saved index", {
            path,
            contentLength: buffer.length,
            totalVectorsSaved: await this.count()
        });
    }

    public async load(path: string) {
        const zip = new adm(path);
        zip.extractAllTo("/tmp", true);

        const index = this.initializeIndex();

        await index.readIndex("/tmp/index.hnsw", true);

        const idMapJson = await readFile("/tmp/idMap.json");
        const metadataJson = await readFile("/tmp/metadata.json");

        this.idMap = JSON.parse(idMapJson.toString());
        this.metadata = JSON.parse(metadataJson.toString());

        this.index = index;

        log.debug("Loaded index", {
            path,
            totalVectorsLoaded: await this.count(),
        });
    }

    // TODO: return bytes
    public async physicalSize() {
        return this.index.getCurrentCount() * 4 * this.config.dimensions
        + JSON.stringify(this.idMap).length
        + JSON.stringify(this.metadata).length;
    }

    public async count() {
        return Object.keys(this.idMap).length;
    }

    public async dimensions() {
        return this.config.dimensions;
    }
}