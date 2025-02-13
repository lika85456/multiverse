import { Vector } from "../core/Vector";
import HNSWIndex from "./HNSWIndex";

// ts-node packages/multiverse/src/Index/hnswSpeedTest.ts

(async() => {
    const hnsw = new HNSWIndex({
        dimensions: 1536,
        space: "l2"
    }, { initialSize: 1000000 });

    console.log("start");

    const indexingStart = Date.now();
    // add milion vectors
    for (let i = 0; i < 1000000; i++) {
        await hnsw.add([{
            vector: Vector.random(1536),
            label: i.toString(),
        }]);

        // every 10% print progress
        if (i % 100000 === 0) {
            console.log(`Indexed ${i} vectors`);
        }
    }

    const indexingEnd = Date.now();
    console.log(`Indexing took ${indexingEnd - indexingStart}`);

    // query
    const start = Date.now();

    // do 1000 queries
    for (let i = 0; i < 1000; i++) {
        const query = Vector.random(1536);
        const results = await hnsw.knn({
            k: 10,
            vector: query,
        });
    }

    const end = Date.now();

    console.log("Time", end - start);
    console.log(`Time per query: ${(end - start) / 1000}ms`);

    // sleep for 1 hour
    await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
})();

// 3GB cca 450000
// 6.2GB cca 950000
// 6.6 GB full
// resizing took 6712078
// Time 794
// Time per query: 0.794ms
