import HNSWIndex from "../Index/HNSWIndex";
import { generateAppRouter } from "./DatabaseRouter";
import { Partition, Vector } from "./Vector";
import VectorDatabase from "./VectorDatabase";

const DIMENSIONS = 1536;

const index = new HNSWIndex({
    dimensions: DIMENSIONS,
    spaceName: "l2",
    size: 500
});
const appRouter = generateAppRouter(new VectorDatabase(index, {
    partition: new Partition(0, 1),
    instanceId: "test-instance"
}));

function randomVector() {
    return new Vector(Array.from({ length: DIMENSIONS }, () => Math.random()));
}

describe("<DatabaseRouter>", () => {
    const caller = appRouter.createCaller({});

    it("should ping pong", async() => {
        const result = await caller.ping();
        expect(result).toBe("pong");
    });

    it("should query empty index", async() => {
        const result = await caller.dbQuery({
            query: {
                k: 10,
                vector: randomVector()
            },
        });

        expect(result.result.length).toBe(0);
    });

    it("should add vectors", async() => {
        const vectors = Array.from({ length: 100 }, () => ({
            id: Math.floor(Math.random() * 10000),
            label: "test label-" + Math.random(),
            lastUpdate: 0,
            vector: randomVector()
        }));

        const result = await caller.dbQuery({
            query: {
                k: 10,
                vector: randomVector()
            },
            updates: vectors
        });

        expect(result.result.length).toBe(10);
    });

    it("should remember added vectors", async() => {
        const result = await caller.dbQuery({
            query: {
                k: 10,
                vector: randomVector()
            }
        });

        expect(result.result.length).toBe(10);
    });
});