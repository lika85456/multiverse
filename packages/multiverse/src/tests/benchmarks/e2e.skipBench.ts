import { bench } from "vitest";
import type { MultiverseDatabase } from "../..";
import Multiverse from "../..";

const multiverse = new Multiverse({
    awsToken: undefined as any,
    name: "bench",
    region: "eu-west-1"
});

async function getWokenDatabase(dimensions: number) {
    // name bench-MM-DD-HH-MM
    const MM = new Date().getMonth() + 1;
    const DD = new Date().getDate();
    const HH = new Date().getHours();
    const MIN = new Date().getMinutes();
    const name = `bench-${MM}-${DD}-${HH}-${MIN}-${dimensions}`;
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

// | Test Case                                             | min       | max        | mean      | rme     | samples |
// |--------------------------------------------------|-----------|------------|-----------|---------|---------|
// | query empty db - 100 dimensions, k = 10          | 110.77    | 266.95     | 136.86    | ±4.63%  | 74      |
// | query empty db - 1536 dimensions, k = 10         | 125.57    | 234.35     | 145.27    | ±3.82%  | 69      |
// | add 1000 vectors - 100 dimensions                | 874.61    | 3,373.16   | 1,699.16  | ±29.19% | 10      |
// | add 1000 vectors - 1536 dimensions               | 10,559.87 | 88,372.86  | 24,206.59 | ±71.75% | 10      |
// | query with 10k stored vectors - 100 dimensions   | 112.20    | 251.80     | 141.21    | ±4.06%  | 71      |
// | query with 10k stored vectors - 1536 dimensions  | 130.16    | 338.43     | 153.10    | ±4.64%  | 66      |

// name                                                 hz       min        max      mean       p75        p99       p995       p999      rme  samples
// · query empty db - 100 dimensions, k = 10          7.2004    107.62     471.13    138.88    139.62     415.93     471.13     471.13   ±7.06%      100
// · query empty db - 1536 dimensions, k = 10         7.0440    119.24     251.09    141.96    148.99     250.75     251.09     251.09   ±3.51%      100
// · add 1 vector - 100 dimensions                    5.1250   93.1949   2,852.08    195.12    235.68     340.94     360.76     424.78   ±3.28%     1000
// · add 1 vector - 1536 dimensions                   7.8011   97.8562   1,105.52    128.19    120.40     218.35   1,105.52   1,105.52  ±15.55%      100
// · add 900 vectors - 100 dimensions                 0.6377  1,197.93   2,033.35  1,568.08  1,853.74   2,033.35   2,033.35   2,033.35  ±13.33%       10
// · add 900 vectors - 1536 dimensions                0.1124  7,115.39  11,818.10  8,893.29  9,718.83  11,818.10  11,818.10  11,818.10  ±11.90%       10   slowest
// · query with 10k stored vectors - 100 dimensions   7.9979    107.23     201.29    125.03    126.64     199.09     201.29     201.29   ±2.44%      100   fastest
// · query with 10k stored vectors - 1536 dimensions  6.7771    122.33     335.41    147.55    149.17     313.85     335.41     335.41   ±4.38%      100

// name                                                 hz       min        max       mean        p75        p99       p995       p999      rme  samples
// · query empty db - 100 dimensions, k = 10          9.4509   89.5014     553.93     105.81     106.80     202.02     256.05     314.58   ±1.39%     1000   fastest
// · query empty db - 1536 dimensions, k = 10         8.4768    100.30     418.99     117.97     119.00     211.46     231.00     302.83   ±1.09%     1000
// · add 1 vector - 100 dimensions                    5.3093   85.3520   3,177.09     188.35     223.06     318.83     333.78     382.77   ±3.72%     1000
// · add 1 vector - 1536 dimensions                   1.5253   99.5054   1,494.83     655.59     825.89   1,224.48   1,380.48   1,433.38   ±2.51%     1000
// · add 900 vectors - 100 dimensions                 0.6028    994.29   4,504.68   1,658.88   1,436.54   4,504.68   4,504.68   4,504.68  ±44.56%       10
// · add 900 vectors - 1536 dimensions                0.0962  7,653.36  15,053.39  10,392.38  12,657.78  15,053.39  15,053.39  15,053.39  ±17.12%       10   slowest
// · query with 10k stored vectors - 100 dimensions   8.6725   95.6208     627.70     115.31     113.70     309.77     398.90     527.80   ±2.15%     1000
// · query with 10k stored vectors - 1536 dimensions  7.3127    108.29   2,311.66     136.75     130.91     332.52     463.60     813.27   ±3.78%     1000

// name                                                  hz       min        max       mean        p75        p99       p995       p999      rme  samples
// · ping-pong                                        15.2252   55.9779     754.75    65.6805    64.1693     116.85     311.23     533.43   ±3.38%     1000
// · query empty db - 100 dimensions, k = 10           8.6734   97.4323     624.11     115.29     115.72     225.06     251.22     451.42   ±1.55%     1000
// · query empty db - 1536 dimensions, k = 10          8.2967    104.44     630.73     120.53     119.75     228.74     285.52     524.12   ±1.62%     1000
// · add 1 vector - 100 dimensions                     4.9062   90.1144   2,969.28     203.82     244.80     409.28     418.87     819.29   ±3.49%     1000
// · add 1 vector - 1536 dimensions                    1.4402   98.4981   2,257.36     694.35     858.19   1,346.88   1,527.07   1,889.07   ±2.58%     1000
// · add 900 vectors - 100 dimensions                  0.4846    818.81   5,138.57   2,063.44   1,584.06   5,138.57   5,138.57   5,138.57  ±52.49%       10
// · add 900 vectors - 1536 dimensions                 0.0668  7,694.47  26,563.74  14,963.07  23,344.12  26,563.74  26,563.74  26,563.74  ±33.87%       10
// · query with 10k stored vectors - 100 dimensions    9.3235   93.3795     413.31     107.26     107.34     171.66     219.36     317.87   ±1.05%     1000
// · query with 10k stored vectors - 1536 dimensions   8.2303    106.44     428.93     121.50     121.62     219.82     252.40     328.85   ±1.03%     1000

// name                                                  hz       min        max       mean        p75        p99       p995       p999      rme  samples
// · ping-pong                                        13.9197   52.7508   2,323.15    71.8407    64.5212     259.02     309.60     434.99   ±6.87%     1000   fastest
// · query empty db - 100 dimensions, k = 10           8.9449   91.6974   2,268.01     111.80     108.35     255.30     331.82   1,030.91   ±4.55%     1000
// · query empty db - 1536 dimensions, k = 10          8.3637    100.76     521.85     119.56     117.38     218.75     394.88     512.75   ±1.72%     1000
// · add 1 vector - 100 dimensions                     5.0298   89.8248   3,108.82     198.81     235.53     395.95     409.92     463.46   ±3.56%     1000
// · add 1 vector - 1536 dimensions                    1.4529    100.15   3,086.83     688.28     850.29   1,331.18   1,433.64   1,500.49   ±2.55%     1000
// · add 900 vectors - 100 dimensions                  0.5060  1,329.16   5,017.74   1,976.15   1,737.78   5,017.74   5,017.74   5,017.74  ±40.89%       10
// · add 900 vectors - 1536 dimensions                 0.0644  9,297.81  27,094.80  15,538.50  23,948.22  27,094.80  27,094.80  27,094.80  ±33.71%       10   slowest
// · query with 10k stored vectors - 100 dimensions    8.6775    100.55     356.58     115.24     116.73     200.96     244.13     322.13   ±1.02%     1000
// · query with 10k stored vectors - 1536 dimensions   7.5886    112.45     412.61     131.78     133.72     247.73     269.92     343.00   ±1.01%     1000

beforeAll(async() => {
    // list databases and remove them
    const databases = await multiverse.listDatabases();

    for (const database of databases) {
        await multiverse.removeDatabase((await database.getConfiguration()).name);
    }

    try {
        await multiverse.destroySharedInfrastructure();
    } catch (e) {
        console.error(e);
    }

    db1536 = await getWokenDatabase(1536);
    db100 = await getWokenDatabase(100);
}, 200000);

afterAll(async() => {
    console.error("Removing databases");
    await multiverse.removeDatabase((await db1536.getConfiguration()).name);
    await multiverse.removeDatabase((await db100.getConfiguration()).name);
}, 200000);

bench("ping-pong", async() => {
    await db100.ping();
}, {
    throws: true,
    iterations: 1000,
    warmupIterations: 2
});

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
    iterations: 1000,
    warmupIterations: 100
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
    iterations: 1000,
    warmupIterations: 100
});

bench("add 1 vector - 100 dimensions", async() => {
    const vectors = Array.from({ length: 1 }, (_, _i) => ({
        label: Math.random() + "RANDOMÁK",
        vector: Array.from({ length: 100 }, () => Math.random())
    }));

    await db100.add(vectors);
}, {
    throws: true,
    iterations: 1000,
    warmupIterations: 0
});

bench("add 1 vector - 1536 dimensions", async() => {
    const vectors = Array.from({ length: 1 }, (_, _i) => ({
        label: Math.random() + "RANDOMÁK",
        vector: Array.from({ length: 1536 }, () => Math.random())
    }));

    await db1536.add(vectors);
}, {
    throws: true,
    iterations: 1000,
    warmupIterations: 0
});

bench("add 900 vectors - 100 dimensions", async() => {
    const vectors = Array.from({ length: 900 }, (_, i) => ({
        label: i + "",
        vector: Array.from({ length: 100 }, () => Math.random())
    }));

    await db100.addAll(vectors, 5 * 60 * 1000);
}, {
    throws: true,
    iterations: 10,
    warmupIterations: 0
});

bench("add 900 vectors - 1536 dimensions", async() => {
    const vectors = Array.from({ length: 900 }, (_, i) => ({
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
        console.log(result.result);
        throw new Error("Result not 10");
    }
}, {
    time: 10000,
    throws: true,
    iterations: 1000,
    warmupIterations: 100
});

bench("query with 10k stored vectors - 1536 dimensions", async() => {
    const result = await db1536.query({
        k: 10,
        sendVector: false,
        vector: Array.from({ length: 1536 }, () => Math.random())
    });

    if (result.result.length !== 10) {
        console.log(result.result);
        throw new Error("Result not 10");
    }
}, {
    time: 10000,
    throws: true,
    iterations: 1000,
    warmupIterations: 100
});