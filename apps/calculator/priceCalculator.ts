type PriceDescription = {
    operation: string,
    service: string,
    description: string,
    price: number
};

// All pricing is in USD, eu-west-1 region

/*
S3 Pricing:
Standard:
STORAGE: $0.023 per GB
PUT,LIST, POST: $0.005 per 1000 requests
GET,SELECT: $0.0004 per 1000 requests

Directory:
STORAGE: $0.16 per GB
PUT,LIST, POST: $0.0025 per 1000 requests
GET,SELECT: $0.0002 per 1000 requests
*/

/*
Lambda pricing:

$0.0000166667 for every GB-second
$0.20 per 1M requests
Ephemeral storage: $0.000000034 for every GB-second
*/

/*
DynamoDB pricing:

4kB = 1 RU
1kB = 1 WU
transactional
4kB = 2 RU
1kB = 2 WU

$0.705 per million write request units
$0.1415 per million read request units
// $0.283 per GB-month thereafter

*/

// per GB, per request
const S3 = {
    standard: {
        storage: 0.023,
        putListPost: 0.005 / 1000,
        getSelect: 0.0004 / 1000,
    },

    directory: {
        storage: 0.16,
        putListPost: 0.0025 / 1000,
        getSelect: 0.0002 / 1000,
    },
};

const LAMBDA = {
    compute: 0.0000166667, // GB per second
    requests: 0.20 / 1000000,
    ephemeralStorage: 0.000000034,
};

const DYNAMODB = {
    read: 0.1415 / 1000000,
    write: 0.705 / 1000000,
};

type CalculatorInput = {
    vectorsStored: number,
    dimensions: number,
    knnQueries: number,
    changeQueries: number,
    replicas: number,
    warmInstances: number
};

export default function calculate({
    vectorsStored,
    dimensions,
    knnQueries,
    changeQueries,
    replicas,
    // warm instances per replica
    warmInstances
}: CalculatorInput) {
    const costs: PriceDescription[] = [];

    // storage
    const vectorSize = dimensions * 4 + 500; // 4 bytes per float and 500 bytes for metadata
    const storedSize = vectorsStored * vectorSize;

    costs.push({
        operation: "storage",
        service: "S3",
        description: "Standard storage",
        price: storedSize / 1024 / 1024 / 1024 * S3.standard.storage
    });

    // KNN request
    costs.push({
        operation: "knn",
        service: "DynamoDB",
        description: "Read infrastructure",
        price: knnQueries * DYNAMODB.read * 2 // transactional for flushing
    });

    if (changeQueries > 0) {
        costs.push({
            operation: "knn",
            service: "S3",
            description: "Read changes",
            price: knnQueries * S3.directory.getSelect * 2 // 2 objects per query?
        });
    }

    costs.push({
        operation: "knn",
        service: "Lambda",
        description: "Orchestrator",
        price: knnQueries * (LAMBDA.requests + LAMBDA.compute * 0.1 * 0.256)
    });

    const neededRAMSize = storedSize; // in bytes
    // 9000 MB is the max size for shard, but the lambda will have 10240MB
    const shards = Math.ceil(neededRAMSize / (9 * 1024 * 1024 * 1024));
    const singleShardMbRAM = shards > 1 ? 10240 : neededRAMSize / 1024 / 1024;

    costs.push({
        operation: "knn",
        service: "Lambda",
        description: `Workers (${shards} shards)`,
        price: knnQueries * shards * (LAMBDA.requests + LAMBDA.compute * 0.007 * singleShardMbRAM / 1024)
    });

    // change queries

    costs.push({
        operation: "change",
        service: "DynamoDB",
        description: "Store changes",
        price: changeQueries * DYNAMODB.write
    });

    costs.push({
        operation: "change",
        service: "Lambda",
        description: "Orchestrator",
        price: changeQueries * (LAMBDA.requests + LAMBDA.compute * 0.1 * 0.256)
    });

    costs.push({
        operation: "change",
        service: "S3",
        description: "Store changes",
        price: changeQueries * S3.directory.putListPost
    });

    // flushing

    // say flushing is after 50MB of vector changes
    const totalDataToFlush = changeQueries * dimensions * 4;
    const totalFlushes = Math.ceil(totalDataToFlush / (50 * 1024 * 1024));

    costs.push({
        operation: "flush",
        service: "DynamoDB",
        description: "Read & write flush flag",
        price: totalFlushes * (DYNAMODB.write * 2 + DYNAMODB.read * 2)
        // read the new index into every instance
        + shards * replicas * warmInstances * DYNAMODB.read
    });

    costs.push({
        operation: "flush",
        service: "S3",
        description: "upload",
        price: totalFlushes * S3.standard.putListPost
    });

    costs.push({
        operation: "flush",
        service: "S3",
        description: "download",
        price: totalFlushes * S3.standard.getSelect * shards * replicas * warmInstances
    });

    costs.push({
        operation: "flush",
        service: "Lambda",
        description: "Orchestrator",
        price: totalFlushes * (LAMBDA.requests + LAMBDA.compute * 0.1 * 0.256)
    });

    // assume singleShardRAM index size
    // lambda network speed is 600mbps = 75MB/s
    costs.push({
        operation: "flush",
        service: "Lambda",
        description: "Worker downloads",
        price: totalFlushes * shards * replicas * warmInstances *
        (LAMBDA.requests + LAMBDA.compute * singleShardMbRAM / 1024 * singleShardMbRAM / 75)
    });

    // prewarming occures every 10 minutes
    // calculate price for a month of prewarming
    const warmsPerMonth = 30 * 24 * 6;

    // warming
    if (warmInstances > 0) {
        costs.push({
            operation: "warming",
            service: "Lambda",
            description: "Orchestrator",
            price: warmsPerMonth * (LAMBDA.requests + LAMBDA.compute * 0.1 * 0.256)
        });
    }

    // 5 seconds stall time
    costs.push({
        operation: "warming",
        service: "Lambda",
        description: "Workers",
        price: warmsPerMonth * shards * replicas * warmInstances * (LAMBDA.requests + LAMBDA.compute * 5 * singleShardMbRAM / 1024)
    });

    // group costs and print them nicely in a table
    // | Service | Operation | Description | Price |

    // summary: for each operation and also each service

    console.table(costs);

    // now group by service

    const serviceCosts: Record<string, number> = {};

    costs.forEach(cost => {
        if (!serviceCosts[cost.service]) {
            serviceCosts[cost.service] = 0;
        }

        serviceCosts[cost.service] += cost.price;
    });

    console.table(Object.entries(serviceCosts));

    // now group by operation

    const operationCosts: Record<string, number> = {};

    costs.forEach(cost => {
        if (!operationCosts[cost.operation]) {
            operationCosts[cost.operation] = 0;
        }

        operationCosts[cost.operation] += cost.price;
    });

    console.table(Object.entries(operationCosts));

    const fullTotal = costs.reduce((acc, cost) => acc + cost.price, 0);

    console.log(`Total: $${fullTotal}`);

    return costs;
}

/*
Pinecone pricing:

Storage (/GB/Month)	Read Units ($/1M RU)	Write Units ($/1M WU)
$0.33	$18	$4.50

The number of RUs used by a query is proportional to the following factors:

    Record count: The number of vectors contained in the target index. Only vectors stored in the relevant namespace are used.
    Record size: Higher dimensionality or larger metadata increases the size of each scanned vector.

Because serverless indexes organize vectors in similarity-based clusters, only a fraction of each index will be read for each query. The number of RUs a query uses therefore increases much more slowly than the index size.

The following table contains the RU cost of a query at different namespace sizes and record dimensionality, assuming an average metadata size around 500 bytes:
Records per namespace	Dimension=384	Dimension=768	Dimension=1536
100,000	5 RUs	5 RUs	6 RUs
1,000,000	6 RUs	10 RUs	18 RUs
10,000,000	18 RUs	32 RUs	59 RUs

TopK value	Additional RUs used
TopK=5	1
TopK=10	1
TopK=50	5

Scanning a namespace has a minimal cost of 5 RUs.

The number of WUs used by an upsert request is proportional to the total size of records it writes and/or modifies, with a minimum of 1 WU.

The following table contains the WU cost of an upsert request at different batch sizes and record dimensionality, assuming an average metadata size around 500 bytes:
Records per batch	Dimension=384	Dimension=768	Dimension=1536
1	3 WUs	4 WUs	7 WUs
10	30 WUs	40 WUs	70 WUs
100	300 WUs	400 WUs	700 WUs

*/

function calculatePinecone({
    vectorsStored,
    dimensions,
    knnQueries,
    changeQueries,
    replicas,
    warmInstances,
}: CalculatorInput): PriceDescription[] {
    const costs: PriceDescription[] = [];

    // Calculate storage costs
    const vectorSize = dimensions * 4 + 500; // 4 bytes per float and 500 bytes for metadata
    const storedSizeGB = (vectorsStored * vectorSize) / (1024 ** 3); // Convert bytes to GB
    const storageCost = storedSizeGB * 0.33;

    costs.push({
        operation: "storage",
        service: "Pinecone",
        description: "Storage",
        price: storageCost,
    });

    // Determine RU cost per knn query based on vectorsStored and dimensions
    let ruPerKnnQuery = 5; // Default minimal cost
    if (vectorsStored >= 10_000_000) {
        if (dimensions === 384) ruPerKnnQuery = 18;
        else if (dimensions === 768) ruPerKnnQuery = 32;
        else if (dimensions === 1536) ruPerKnnQuery = 59;
    } else if (vectorsStored >= 1_000_000) {
        if (dimensions === 384) ruPerKnnQuery = 6;
        else if (dimensions === 768) ruPerKnnQuery = 10;
        else if (dimensions === 1536) ruPerKnnQuery = 18;
    }

    const knnReadUnits = ruPerKnnQuery * knnQueries;
    const knnReadCost = (knnReadUnits / 1_000_000) * 18; // $18 per 1M RUs

    costs.push({
        operation: "knn_queries",
        service: "Pinecone",
        description: "k-NN Queries",
        price: knnReadCost,
    });

    // Calculate change query costs (write units)
    let wuPerChangeQuery = 1; // Default minimal cost
    if (changeQueries > 0) {
        if (dimensions === 384) wuPerChangeQuery = 3;
        else if (dimensions === 768) wuPerChangeQuery = 4;
        else if (dimensions === 1536) wuPerChangeQuery = 7;
    }

    const changeWriteUnits = wuPerChangeQuery * changeQueries;
    const changeWriteCost = (changeWriteUnits / 1_000_000) * 4.5; // $4.50 per 1M WUs

    costs.push({
        operation: "change_queries",
        service: "Pinecone",
        description: "Change Queries",
        price: changeWriteCost,
    });

    // Add replica and instance costs (not detailed in pricing, placeholder for future use)
    const replicaCost = replicas * warmInstances * 0; // Placeholder as no specific cost is given

    costs.push({
        operation: "replicas",
        service: "Pinecone",
        description: "Replica and Warm Instances",
        price: replicaCost,
    });

    return costs;
}

// const input = {
//     changeQueries: 0,
//     dimensions: 1536,
//     knnQueries: 900,
//     replicas: 2,
//     vectorsStored: 1000,
//     warmInstances: 3
// };

// const input = {
//     changeQueries: 10_000,
//     dimensions: 1536,
//     knnQueries: 200_000,
//     replicas: 3,
//     vectorsStored: 300_000,
//     warmInstances: 8
// };

const input = {
    changeQueries: 0,
    dimensions: 384,
    knnQueries: 10000,
    replicas: 1,
    vectorsStored: 100_000_000,
    warmInstances: 0
};

calculate(input);

console.log(`Pinecone total price: $${calculatePinecone(input).reduce((acc, cost) => acc + cost.price, 0)}`);