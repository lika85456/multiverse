import { bench } from "vitest";
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

beforeAll(async() => {
    db = await getWokenDatabase(1536);
});

afterAll(async() => {
    await multiverse.removeDatabase((await db.getConfiguration()).name);
});

bench("query empty db - 1536 dimensions, k = 10", async() => {
    const result = await db.query({
        k: 10,
        sendVector: true,
        vector: Array.from({ length: 1536 }, () => Math.random())
    });

    if (result.result.length !== 0) {
        throw new Error("Database not empty");
    }
}, {
    time: 20000,
    throws: true,
    iterations: 10,
    warmupIterations: 5
});

// bench("normal sorting 2", () => {
//     const a = 1 + 2;
// }, {
//     time: 1000,
//     iterations: 3
// });