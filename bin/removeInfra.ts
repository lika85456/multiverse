import { S3 } from "@aws-sdk/client-s3";

const region = "eu-central-1";

const s3 = new S3({
    region,
});

(async ()=>{
    const buckets = await s3.listBuckets({});
    console.log(buckets);

    const bucketsToDelete = buckets.Buckets?.map(bucket => bucket.Name).filter(name => (
        name?.startsWith("multiverse-test-changes") ||
        name?.endsWith("-snapshot") ||
        name?.startsWith("multiverse-build") ||
        name?.startsWith("multiverse-snapshot") ||
        name?.startsWith("mv")
        ));
    console.log(bucketsToDelete);

    if (bucketsToDelete) {
        for (const bucket of bucketsToDelete) {
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
            }
            catch(e) {
                console.log(`cannot delete bucket ${bucket}`);
                console.log(e);
            }
        }
    }

    console.log("Done");
})();