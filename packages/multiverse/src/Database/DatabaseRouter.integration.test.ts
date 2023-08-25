import type { DatabaseConfig } from "../DatabaseConfig";
import HNSWIndex from "../Index/HNSWIndex";
import MemoryVectorStore from "../VectorStore/Memory/MemoryVectorStore";
import { generateAppRouter } from "./DatabaseRouter";
import { FSIndexStorage } from "./IndexStorage/FSIndexStorage";
import { Partition, Vector } from "./Vector";
import VectorDatabase from "./VectorDatabase";

const DIMENSIONS = 1536;

function createRouter() {
    const index = new HNSWIndex({
        dimensions: DIMENSIONS,
        spaceName: "l2",
        size: 500
    });

    const database: DatabaseConfig = {
        awakeInstances: 5,
        databaseName: "test-database",
        dimensions: DIMENSIONS,
        owner: "test-owner",
        mainRegion: "eu-central-1",
        secondaryRegions: []
    };

    const indexStorage = new FSIndexStorage();

    const vectorStore = new MemoryVectorStore();

    const appRouter = generateAppRouter(new VectorDatabase(index, {
        partition: new Partition(0, 1),
        instanceId: "test-instance",
        database,
        indexStorage,
        vectorStore
    }));

    afterAll(async() => {
        await indexStorage.clean();
    });

    return {
        router: appRouter.createCaller({}),
        vectorStore
    };
}

function randomVector() {
    return new Vector(Array.from({ length: DIMENSIONS }, () => Math.random()));
}

describe("<DatabaseRouter>", () => {
    describe("Basic functions", () => {
        const { router } = createRouter();

        it("should ping pong", async() => {
            const result = await router.ping();
            expect(result).toBe("pong");
        });

        it("should query empty index", async() => {
            const result = await router.dbQuery({
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

            const result = await router.dbQuery({
                query: {
                    k: 10,
                    vector: randomVector()
                },
                updates: vectors
            });

            expect(result.result.length).toBe(10);
        });

        it("should remember added vectors", async() => {
            const result = await router.dbQuery({
                query: {
                    k: 10,
                    vector: randomVector()
                }
            });

            expect(result.result.length).toBe(10);
        });
    });

    describe("Indexing and syncing", () => {

        let indexingRouter: ReturnType<typeof createRouter>;
        let emptyRouter: ReturnType<typeof createRouter>;

        beforeAll(async() => {
            indexingRouter = createRouter();
            emptyRouter = createRouter();

            const vectors = Array.from({ length: 100 }, () => ({
                id: Math.floor(Math.random() * 1000000),
                label: "test label-" + Math.random(),
                lastUpdate: 0,
                vector: randomVector()
            }));

            await indexingRouter.vectorStore.add(vectors);
        });

        it("should throw if no snapshot found", async() => {
            expect(async() => {
                await emptyRouter.router.loadIndexCollection();
            }).rejects.toThrow();
        });

        it("should index the collection", async() => {
            await indexingRouter.router.indexCollection();

            const query = new Vector(Array.from({ length: DIMENSIONS }, () => Math.random()));

            const emptyResult = await emptyRouter.router.dbQuery({
                query: {
                    k: 10,
                    vector: query
                }
            });

            const indexingResult = await indexingRouter.router.dbQuery({
                query: {
                    k: 10,
                    vector: query
                }
            });

            expect(emptyResult.result.length).toBe(0);
            expect(indexingResult.result.length).toBe(10);
        });

        it("should download the collection", async() => {
            await emptyRouter.router.loadIndexCollection();

            const query = new Vector(Array.from({ length: DIMENSIONS }, () => Math.random()));

            const emptyResult = await emptyRouter.router.dbQuery({
                query: {
                    k: 10,
                    vector: query
                }
            });

            const indexingResult = await indexingRouter.router.dbQuery({
                query: {
                    k: 10,
                    vector: query
                }
            });

            expect(emptyResult.result.length).toBe(10);
            expect(indexingResult.result.length).toBe(10);

            expect(emptyResult.result[0].id).toBe(indexingResult.result[0].id);
        });

    });
});