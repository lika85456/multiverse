import log from "@multiverse/log";
import type { MultiverseDatabase } from "..";
import Multiverse from "..";

const multiverse = new Multiverse({
    awsToken: undefined as any,
    name: "bench",
    region: "eu-west-1"
});

async function getWokenDatabase(dimensions: number) {
    const name = "bench-" + Math.random().toString(36).slice(2);
    await multiverse.createDatabase({
        name,
        dimensions,
        region: "eu-west-1",
        secretTokens: [{
            name: "hovnokleslo",
            secret: "hovnokleslo",
            validUntil: Number.MAX_SAFE_INTEGER / 1000
        }],
        space: "l2"
    });

    // @ts-ignore
    const db = await multiverse.getDatabase(name);
    if (!db) {
        throw new Error("Database not found");
    }

    // wake up the db
    for (let i = 0;i < 3;i++) {

        const result = await db.query({
            k: 10,
            sendVector: true,
            vector: Array.from({ length: 1536 }, () => Math.random())
        });

        if (result.result.length !== 0) {
            throw new Error("Database not empty");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return db;
}

let db: MultiverseDatabase;

const iterations = 10;

(async() => {
    db = await getWokenDatabase(1536);

    try {
        const now = process.hrtime.bigint();
        for (let i = 0;i < iterations;i++) {
            const itNow = process.hrtime.bigint();
            const result = await db.query({
                k: 10,
                sendVector: true,
                vector: Array.from({ length: 1536 }, () => Math.random())
            });

            if (result.result.length !== 0) {
                throw new Error("Database not empty");
            }

            const itDiff = process.hrtime.bigint() - itNow;
            log.info(`Query empty db - 1536 dimensions, k = 10: ${Number(itDiff) / 1e6} ms`);
        }

        const diff = process.hrtime.bigint() - now;
        log.info("=====================================");
        log.info(`Query empty db - 1536 dimensions, k = 10: ${Number(diff) / 1e6 / iterations} ms`);
    } catch (e) {
        log.error(e);
    } finally {
        await multiverse.removeDatabase((await db.getConfiguration()).name);
    }
})();

// beforeAll(async() => {
//     db = await getWokenDatabase(1536);
// });

// afterAll(async() => {
//     await multiverse.removeDatabase((await db.getConfiguration()).name);
// }, 120000);

// bench("query empty db - 1536 dimensions, k = 10", async() => {
//     const result = await db.query({
//         k: 10,
//         sendVector: true,
//         vector: Array.from({ length: 1536 }, () => Math.random())
//     });

//     if (result.result.length !== 0) {
//         throw new Error("Database not empty");
//     }
// }, {
//     time: 20000,
//     throws: true,
//     iterations: 10,
//     warmupIterations: 2
// });