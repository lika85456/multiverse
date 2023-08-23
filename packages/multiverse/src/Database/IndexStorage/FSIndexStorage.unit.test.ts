import { unlink } from "fs/promises";
import HNSWIndex from "../../Index/HNSWIndex";
import { Vector } from "../Vector";

describe("<FSIndexStorage>", () => {
    const indexToStore = new HNSWIndex({
        dimensions: 3,
        size: 200,
        spaceName: "l2"
    });

    beforeAll(async() => {
        let id = 0;
        // add 100 random vectors to index
        const vectors = Array.from({ length: 100 }, () => ({
            id: id++,
            label: "test label-" + Math.random(),
            lastUpdate: 0,
            vector: new Vector(Array.from({ length: 3 }, () => Math.random()))
        }));

        await indexToStore.add(vectors);
    });

    const path = "/tmp/" + Math.random().toString(36).substring(2, 10) + ".hnsw";

    afterAll(async() => {
        await unlink(path);
    });

    it("should save", async() => {
        await indexToStore.save(path);
    });

    it("should load", async() => {
        const newIndex = new HNSWIndex({
            dimensions: 3,
            size: 200,
            spaceName: "l2"
        });

        await newIndex.load(path);

        expect(newIndex.physicalSize()).toBe(100);
    });
});