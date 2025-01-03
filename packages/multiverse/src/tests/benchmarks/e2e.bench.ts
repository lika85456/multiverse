import { bench } from "vitest";
import type { MultiverseDatabase } from "../..";
import Multiverse from "../..";

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

    return db;
}

let db1536: MultiverseDatabase;
let db100: MultiverseDatabase;

// with logging
// name                                                 hz        min        max       mean        p75        p99       p995       p999      rme  samples
// ⠼ query empty db - 100 dimensions, k = 10          0.1053   5,380.95  38,744.88   9,499.32   6,897.88  38,744.88  38,744.88  38,744.88  ±77.49%       10
// ⠼ query empty db - 1536 dimensions, k = 10         0.1520   5,300.90   7,868.95   6,580.48   6,958.81   7,868.95   7,868.95   7,868.95   ±9.40%       10
// ⠼ add 1000 vectors - 100 dimensions                0.1976   4,525.21   6,354.70   5,060.81   5,229.50   6,354.70   6,354.70   6,354.70   ±8.54%       10
// ⠼ add 1000 vectors - 1536 dimensions               0.0265  35,581.81  41,900.80  37,676.86  39,434.78  41,900.80  41,900.80  41,900.80   ±3.74%       10
// ⠼ query with 10k stored vectors - 100 dimensions   0.1149   5,000.73  35,881.42   8,706.32   6,240.21  35,881.42  35,881.42  35,881.42  ±78.70%       10
// ⠼ query with 10k stored vectors - 1536 dimensions  0.0000     0.0000     0.0000     0.0000     0.0000     0.0000     0.0000     0.0000   ±0.00%        0

// without logging
// name                                                 hz        min        max       mean        p75        p99       p995       p999      rme  samples
// · query empty db - 100 dimensions, k = 10          7.3068     110.77     266.95     136.86     142.88     266.95     266.95     266.95   ±4.63%       74   fastest
// · query empty db - 1536 dimensions, k = 10         6.8838     125.57     234.35     145.27     149.44     234.35     234.35     234.35   ±3.82%       69
// · add 1000 vectors - 100 dimensions                0.5885     874.61   3,373.16   1,699.16   1,780.16   3,373.16   3,373.16   3,373.16  ±29.19%       10
// · add 1000 vectors - 1536 dimensions               0.0413  10,559.87  88,372.86  24,206.59  19,991.34  88,372.86  88,372.86  88,372.86  ±71.75%       10   slowest
// · query with 10k stored vectors - 100 dimensions   7.0819     112.20     251.80     141.21     144.58     251.80     251.80     251.80   ±4.06%       71
// · query with 10k stored vectors - 1536 dimensions  6.5315     130.16     338.43     153.10     153.35     338.43     338.43     338.43   ±4.64%       66

| Test Case                                             | min       | max        | mean      | rme     | samples |
|--------------------------------------------------|-----------|------------|-----------|---------|---------|
| query empty db - 100 dimensions, k = 10          | 110.77    | 266.95     | 136.86    | ±4.63%  | 74      | 
| query empty db - 1536 dimensions, k = 10         | 125.57    | 234.35     | 145.27    | ±3.82%  | 69      | 
| add 1000 vectors - 100 dimensions                | 874.61    | 3,373.16   | 1,699.16  | ±29.19% | 10      |
| add 1000 vectors - 1536 dimensions               | 10,559.87 | 88,372.86  | 24,206.59 | ±71.75% | 10      |
| query with 10k stored vectors - 100 dimensions   | 112.20    | 251.80     | 141.21    | ±4.06%  | 71      |
| query with 10k stored vectors - 1536 dimensions  | 130.16    | 338.43     | 153.10    | ±4.64%  | 66      |



beforeAll(async() => {
    try {
        await multiverse.removeDatabase((await db1536.getConfiguration()).name);
    } catch (e) {
        // nop
    }
    try {
        await multiverse.removeDatabase((await db100.getConfiguration()).name);
    } catch (e) {
        // nop
    }
    try {
        await multiverse.destroySharedInfrastructure();
    } catch (e) {
        // noop
    }

    db1536 = await getWokenDatabase(1536);
    db100 = await getWokenDatabase(100);
}, 200000);

afterAll(async() => {
    await multiverse.removeDatabase((await db1536.getConfiguration()).name);
    await multiverse.removeDatabase((await db100.getConfiguration()).name);
}, 200000);

bench("query empty db - 100 dimensions, k = 10", async() => {
    const result = await db100.query({
        k: 10,
        sendVector: false,
        vector: Array.from({ length: 100 }, () => Math.random())
    });

    if (result.result.length !== 0) {
        throw new Error("Database not empty");
    }
}, {
    time: 10000,
    throws: true,
    iterations: 10,
    warmupIterations: 2
});

bench("query empty db - 1536 dimensions, k = 10", async() => {
    const result = await db1536.query({
        k: 10,
        sendVector: false,
        vector: Array.from({ length: 1536 }, () => Math.random())
    });

    if (result.result.length !== 0) {
        throw new Error("Database not empty");
    }
}, {
    time: 10000,
    throws: true,
    iterations: 10,
    warmupIterations: 2
});

bench("add 1000 vectors - 100 dimensions", async() => {
    const vectors = Array.from({ length: 1000 }, (_, i) => ({
        label: i + "",
        vector: Array.from({ length: 100 }, () => Math.random())
    }));

    await db100.addAll(vectors, 5 * 60 * 1000);
}, {
    throws: true,
    iterations: 10,
    warmupIterations: 0
});

bench("add 1000 vectors - 1536 dimensions", async() => {
    const vectors = Array.from({ length: 1000 }, (_, i) => ({
        label: i + "",
        vector: Array.from({ length: 1536 }, () => Math.random())
    }));

    await db1536.addAll(vectors, 5 * 60 * 1000);
}, {
    throws: true,
    iterations: 10,
    warmupIterations: 0
});

bench("query with 10k stored vectors - 100 dimensions", async() => {
    const result = await db100.query({
        k: 10,
        sendVector: false,
        vector: Array.from({ length: 100 }, () => Math.random())
    });

    if (result.result.length !== 10) {
        throw new Error("Database not empty");
    }
}, {
    time: 10000,
    throws: true,
    iterations: 10,
    warmupIterations: 2
});

bench("query with 10k stored vectors - 1536 dimensions", async() => {
    const result = await db1536.query({
        k: 10,
        sendVector: false,
        vector: Array.from({ length: 1536 }, () => Math.random())
    });

    if (result.result.length !== 10) {
        throw new Error("Database not empty");
    }
}, {
    time: 10000,
    throws: true,
    iterations: 10,
    warmupIterations: 2
});