import { Lambda, Runtime } from "@aws-sdk/client-lambda";

const lambda = new Lambda({ region: "eu-central-1" });

export async function deployDatabaseLambda({
    functionName, databaseName, collectionName
}: {
    functionName: string;
    databaseName: string;
    collectionName: string
}) {
    const { FunctionArn } = await lambda.createFunction({
        FunctionName: functionName,
        Runtime: Runtime.nodejs18x,
        Role: "arn:aws:iam::123456789012:role/lambda-role",
        Handler: "handler.handler",
        Code: { ImageUri: "123456789012.dkr.ecr.eu-central-1.amazonaws.com/multiverse-database:latest" },
        PackageType: "Image",
        Timeout: 60,
        MemorySize: 1024,
        Environment: {
            Variables: {
                DATABASE_NAME: databaseName,
                COLLECTION_NAME: collectionName
            }
        }
    });

    return FunctionArn;
}