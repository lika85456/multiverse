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

export default function calculate({
    vectorsStored,
    dimensions,
    knnQueries,
    changeQueries,
    replicas,
    // warm instances per replica
    warmInstances
}: {
    vectorsStored: number,
    dimensions: number,
    knnQueries: number,
    changeQueries: number,
    replicas: number,
    warmInstances: number
}) {
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

    costs.push({
        operation: "knn",
        service: "S3",
        description: "Read changes",
        price: knnQueries * S3.directory.getSelect * 2 // 2 objects per query?
    });

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
    costs.push({
        operation: "warming",
        service: "Lambda",
        description: "Orchestrator",
        price: warmsPerMonth * (LAMBDA.requests + LAMBDA.compute * 0.1 * 0.256)
    });

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

calculate({
    changeQueries: 0,
    dimensions: 1536,
    knnQueries: 900,
    replicas: 2,
    vectorsStored: 1000,
    warmInstances: 3
});