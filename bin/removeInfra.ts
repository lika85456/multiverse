
// const region = "eu-central-1";

// const s3 = new S3({
//     region,
// });

// (async ()=>{
//     const buckets = await s3.listBuckets({});
//     console.log(buckets);

//     const bucketsToDelete = buckets.Buckets?.map(bucket => bucket.Name).filter(name => (
//         name?.startsWith("multiverse-test-changes") ||
//         name?.endsWith("-snapshot") ||
//         name?.startsWith("multiverse-build") ||
//         name?.startsWith("multiverse-snapshot") ||
//         name?.startsWith("mv")
//         ));
//     console.log(bucketsToDelete);

//     if (bucketsToDelete) {
//         for (const bucket of bucketsToDelete) {
//             try{
//             // first clear the bucket
//             const objects = await s3.listObjectsV2({ Bucket: bucket });
//             if (objects.Contents) {
//                 await Promise.all(objects.Contents.map(async object => {
//                     await s3.deleteObject({ Bucket: bucket, Key: object.Key });
//                 }));
//             }

//             // then delete the bucket
//             await s3.deleteBucket({ Bucket: bucket });
//             }
//             catch(e) {
//                 console.log(`cannot delete bucket ${bucket}`);
//                 console.log(e);
//             }
//         }
//     }

//     console.log("Done");
// })();

import { S3 } from "@aws-sdk/client-s3";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Lambda } from "@aws-sdk/client-lambda";
import log from "@multiverse/log";

const region = "eu-west-1";

const s3 = new S3({region});
const dynamo =  new DynamoDB({region});
const lambda = new Lambda({region});

async function removeApp(tags: {[key:string]:string}[]) {
    // await findBucketsToRemove(tags);
}

async function findBucketsToRemove(tags: { [key: string]: string; }[]): Promise<string[]> {
    const buckets = await s3.listBuckets({ BucketRegion: region });
    if (!buckets || !buckets.Buckets) {
        log.error("No buckets found");
        return [];
    }

    // get tags for each bucket
    const bucketsWithTags = await Promise.all(buckets.Buckets!.map(async (bucket) => {
        try{
            const tags = await s3.getBucketTagging({ Bucket: bucket.Name });
            return {
                bucket: bucket.Name,
                tags: tags.TagSet
            };
        }
        catch(e) {
            if(e.name === "NoSuchTagSet") {
                return {
                    bucket: bucket.Name,
                    tags: []
                };
            }
            throw e;
        }
        
    }));
    // filter buckets with the right tags
    const bucketsToDelete = bucketsWithTags.filter(bucket => {
        for (const tag of tags) {
            const tagKey = Object.keys(tag)[0];
            const tagValue = tag[tagKey];

            if (!bucket.tags?.find(t => t.Key === tagKey && t.Value === tagValue)) {
                return false;
            }
        }

        return true;
    });

    return bucketsToDelete.map(bucket => bucket.bucket!).filter(name => !!name);
}

async function findDynamoTablesToRemove(tags: { [key: string]: string; }[]): Promise<string[]> {
    const tables = await dynamo.listTables({});
    if (!tables || !tables.TableNames) {
        log.error("No tables found");
        return [];
    }

    // get tags for each table
    const tablesWithTags = await Promise.all(tables.TableNames!.map(async (tableName) => {
        const tableDetails = await dynamo.describeTable({ TableName: tableName });
        const tableArn = tableDetails.Table?.TableArn;
        const tags = await dynamo.listTagsOfResource({ ResourceArn: tableArn! });
        return {
            table: tableName,
            tags: tags.Tags
        };
    }));

    // filter tables with the right tags
    const tablesToDelete = tablesWithTags.filter(table => {
        for (const tag of tags) {
            const tagKey = Object.keys(tag)[0];
            const tagValue = tag[tagKey];
            if (!table.tags?.find(t => t.Key === tagKey && t.Value === tagValue)) {
                return false;
            }
        }

        return true;
    });

    return tablesToDelete.map(table => table.table!).filter(name => !!name);
}

async function findLambdasToRemove(tags: { [key: string]: string; }[]): Promise<string[]> {
    const functions = await lambda.listFunctions({});
    if (!functions || !functions.Functions) {
        log.error("No functions found");
        return [];
    }

    // get tags for each function
    const functionsWithTags = await Promise.all(functions.Functions!.map(async (func) => {
        const tags = await lambda.listTags({ Resource: func.FunctionArn });
        return {
            func,
            tags: tags.Tags
        };
    }));

    // filter functions with the right tags
    const functionsToDelete = functionsWithTags.filter(func => {
        for (const tag of tags) {
            const tagKey = Object.keys(tag)[0];
            const tagValue = tag[tagKey];
            if(func.tags?.[tagKey]  !== tagValue) {
                return false;
            }
        }

        return true;
    });

    return functionsToDelete.map(func => func.func!.FunctionArn!).filter(name => !!name);
}

async function deleteBuckets(buckets: string[]) {
    if (buckets.length === 0) {
        log.info("No buckets to delete");
        return;
    }

    for (const bucket of buckets) {
        try{
            // first clear the bucket
            const objects = await s3.listObjectsV2({ Bucket: bucket });
            if (objects.Contents) {
                await Promise.all(objects.Contents.map(async object => {
                    await s3.deleteObject({ Bucket: bucket, Key: object.Key });
                }));
            }

            // then delete the bucket
            await s3.deleteBucket({ Bucket: bucket });
            log.info(`Deleted bucket ${bucket}`);
        }
        catch(e) {
            log.error(`Cannot delete bucket ${bucket}`);
            log.error(e);
        }
    }
}

async function deleteTables(tables: string[]) {
    if (tables.length === 0) {
        log.info("No tables to delete");
        return;
    }

    for (const table of tables) {
        try{
            await dynamo.deleteTable({ TableName: table });
            log.info(`Deleted table ${table}`);
        }
        catch(e) {
            log.error(`Cannot delete table ${table}`);
            log.error(e);
        }
    }
}

async function deleteFunctions(functions: string[]) {
    if (functions.length === 0) {
        log.info("No functions to delete");
        return;
    }

    for (const func of functions) {
        try{
            await lambda.deleteFunction({ FunctionName: func });
            log.info(`Deleted function ${func}`);
        }
        catch(e) {
            log.error(`Cannot delete function ${func}`);
            log.error(e);
        }
    }
}

(async ()=>{
    const [
        buckets, tables, lambdas
    ] = await Promise.all([
        findBucketsToRemove([{ "sst:stage":"dev", "sst:app":"multiverse" }]),
        findDynamoTablesToRemove([{ "sst:stage":"dev", "sst:app":"multiverse" }]),
        findLambdasToRemove([{ "sst:stage":"dev", "sst:app":"multiverse" }])
    ]);

    log.info("Tables to remove:");
    log.info(tables);

    log.info("Buckets to remove:");
    log.info(buckets);

    log.info("Lambdas to remove:");
    log.info(lambdas);

    // take input from user (y=delete)
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question("Do you want to delete these resources? (y/n)", async (answer: string) => {
        if (answer === "y") {
            await Promise.all([
                deleteBuckets(buckets),
                deleteTables(tables),
                deleteFunctions(lambdas)
            ]);
        }

        readline.close();
    });
})();