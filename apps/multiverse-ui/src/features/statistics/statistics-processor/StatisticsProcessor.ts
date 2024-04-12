import { getSessionUser } from "@/lib/mongodb/collections/user";
import { generateHex } from "@/server/multiverse-interface/MultiverseMock";
import {
    CreateQueueCommand, DeleteQueueCommand, SQSClient
} from "@aws-sdk/client-sqs";
import type { AwsTokenGet } from "@/lib/mongodb/collections/aws-token";
import { getAwsTokenByTokenId } from "@/lib/mongodb/collections/aws-token";
import type { Event } from "@/features/statistics/statistics-processor/event";

export interface IStatisticsProcessor {

    /**
     * Processes queue messages from SQS queue for all users.
     */
    processQueueMessages(queueName: string, awsToken: AwsTokenGet): Promise<Event[]>;

    /**
     * Creates a SQS queue in the AWS account of the client.
     */
    createQueue(): Promise<string>;

    /**
     * Deletes the SQS queue in the AWS account of the client.
     */
    deleteQueue(): Promise<void>;
}

export class StatisticsProcessor implements IStatisticsProcessor {

    async processQueueMessages(queueName: string, awsToken: AwsTokenGet): Promise<Event[]> {
        console.log("Processing users queue");

        return [];
    }

    async createQueue(): Promise<string> {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            throw new Error("User not found");
        }
        if (sessionUser.sqsQueue) {
            throw new Error("SQS queue already exists");
        }
        if (!sessionUser.awsToken) {
            throw new Error("AWS Token not found");
        }

        const awsToken = await getAwsTokenByTokenId(sessionUser.awsToken);
        if (!awsToken) {
            throw new Error("AWS Token not found");
        }

        const queueName = `multiverse-${awsToken._id}-${generateHex(8)}`;

        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessTokenId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        const createQueueCommand = new CreateQueueCommand({ QueueName: queueName });
        console.log("Creating queue: ", queueName);
        try {
            await sqsClient.send(createQueueCommand);
        } catch (error) {
            console.error("Error creating queue: ", error);
            throw error;
        }
        console.log("Queue created: ", queueName);

        return queueName;
    }

    async deleteQueue(): Promise<void> {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            throw new Error("User not found");
        }
        if (!sessionUser.sqsQueue) {
            throw new Error("SQS queue not found");
        }
        if (!sessionUser.awsToken) {
            throw new Error("AWS Token not found");
        }

        const awsToken = await getAwsTokenByTokenId(sessionUser.awsToken);
        if (!awsToken) {
            throw new Error("AWS Token not found");
        }

        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessTokenId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        const deleteQueueCommand = new DeleteQueueCommand({ QueueUrl: sessionUser.sqsQueue });
        try {
            await sqsClient.send(deleteQueueCommand);
        } catch (error) {
            console.error("Error creating queue: ", error);
            throw error;
        }
    }
}