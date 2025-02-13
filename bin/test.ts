import { S3 } from "@aws-sdk/client-s3";

const s3 = new S3({
    region: "eu-central-1",
});

(async ()=>{
    const buckets = await s3.listBuckets({});

    const bucketsToDelete = buckets.Buckets?.map(bucket => bucket.Name).filter(name => name.startsWith("multiverse-test-changes"));
    console.log(bucketsToDelete);

    if (bucketsToDelete) {
        for (const bucket of bucketsToDelete) {
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
    }

    console.log("Done");
})();