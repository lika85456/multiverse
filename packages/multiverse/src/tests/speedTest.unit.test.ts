import { Vector } from "../core/Vector";
import HNSWIndex from "../Index/HNSWIndex";

describe.only("HNSW Speed test", () => {
    it("should", async() => {
        const hnsw = new HNSWIndex({
            dimensions: 1536,
            space: "l2"
        });

        console.log("start");

        const indexingStart = Date.now();
        // add milion vectors
        for (let i = 0; i < 1000000; i++) {
            await hnsw.add([{
                vector: Vector.random(1536),
                label: i.toString(),
            }]);

            if (i % 10000)
                console.log(i);
        }

        const indexingEnd = Date.now();
        console.log(`Indexing took ${indexingEnd - indexingStart}`);

        // query
        const start = Date.now();

        // do 100 queries
        for (let i = 0; i < 100; i++) {
            const query = Vector.random(1536);
            const results = await hnsw.knn({
                k: 10,
                vector: query,
            });

            expect(results).toHaveLength(10);
        }

        const end = Date.now();

        console.log("Time", end - start);
        console.log(`Time per query: ${(end - start)}ms`);
    });
});