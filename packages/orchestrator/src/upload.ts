/* eslint-disable turbo/no-undeclared-env-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import https from "https";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl, } from "@aws-sdk/s3-request-presigner";
import { v4 } from "uuid";

const createPresignedUrlWithClient = ({
    region, bucket, key
}: {
    region: string;
    bucket: string;
    key: string;
}) => {
    const client = new S3Client({ region });
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key
    });

    return getSignedUrl(client, command, { expiresIn: 3600 });
};

function put(url: string, data: any) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            url,
            {
                method: "PUT",
                headers: { "Content-Length": new Blob([data]).size }
            },
            (res) => {
                let responseBody = "";
                res.on("data", (chunk) => {
                    responseBody += chunk;
                });
                res.on("end", () => {
                    resolve(responseBody);
                });
            }
        );
        req.on("error", (err) => {
            reject(err);
        });
        req.write(data);
        req.end();
    });
}
export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context

): Promise<APIGatewayProxyResult> => {

    const bucket = process.env.COLLECTIONS_BUCKET!;
    const key = v4();
    const region = process.env.AWS_REGION!;

    const url = createPresignedUrlWithClient({
        region,
        bucket,
        key
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ url, }),
    };

};