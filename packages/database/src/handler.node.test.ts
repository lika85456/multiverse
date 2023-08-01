import MemoryCollection from "@multiverse/core/src/Collection/MemoryCollection";
import { handlerGenerator } from "./handler";
import KNN from "./knn";

describe("<Handler>", () => {

    const knn = new KNN({
        collection: new MemoryCollection({
            vectors: [],
            dimensions: 3
        })
    });
    const handler = handlerGenerator(knn, "instanceId");

    describe("Bad requests", () => {
        it("should fail on no post", async() => {
            const res = await handler({} as any, {} as any);

            expect(res.statusCode).toBe(405);
        });

        it("should fail on no path", async() => {
            const res = await handler({ httpMethod: "POST" } as any, {} as any);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("KNN", () => {

        it("should search empty", async() => {
            const res = await handler({
                httpMethod: "POST",
                path: "/knn",
                body: JSON.stringify({ query: [1, 2, 3], })
            } as any, {} as any);

            const body = JSON.parse(res.body);
            expect(res.statusCode).toBe(200);
            expect(body.searchResult.neighbors).toEqual([]);
            expect(body.searchResult.distances).toEqual([]);
        });

        it("should add", async() => {
            const res = await handler({
                httpMethod: "POST",
                path: "/knn",
                body: JSON.stringify({
                    query: [1, 2, 3],
                    k: 3,
                    updates: [
                        {
                            label: 1,
                            vector: [1, 2, 3]
                        },
                        {
                            label: 2,
                            vector: [4, 5, 6]
                        }
                    ]
                })
            } as any, {} as any);

            const body = JSON.parse(res.body);
            expect(res.statusCode).toBe(200);
            expect(body.searchResult.neighbors).toEqual([1, 2]);
            expect(body.searchResult.distances).toEqual([0, 27]);
        });

        it("should remove", async() => {
            const res = await handler({
                httpMethod: "POST",
                path: "/knn",
                body: JSON.stringify({
                    query: [1, 2, 3],
                    k: 3,
                    updates: [
                        {
                            label: 1,
                            deactivated: true
                        }
                    ]
                })
            } as any, {} as any);

            const body = JSON.parse(res.body);
            expect(res.statusCode).toBe(200);
            expect(body.searchResult.neighbors).toEqual([2]);
            expect(body.searchResult.distances).toEqual([27]);
        });
    });

    describe("Miscellaneous", () => {
        it("should wait", async() => {

            const res = await handler({
                httpMethod: "POST",
                path: "/wait",
                body: JSON.stringify({ time: 100 })
            } as any, {} as any);

            expect(res.statusCode).toBe(200);
        });
    });
});