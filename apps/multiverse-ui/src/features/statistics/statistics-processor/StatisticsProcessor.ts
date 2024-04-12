import { getSessionUser } from "@/lib/mongodb/collections/user";
import { generateHex } from "@/server/multiverse-interface/MultiverseMock";
import type { ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import {
    CreateQueueCommand, DeleteQueueCommand, GetQueueUrlCommand, SQSClient
} from "@aws-sdk/client-sqs";
import { getAwsTokenByTokenId } from "@/lib/mongodb/collections/aws-token";
import type { Event } from "@/features/statistics/statistics-processor/event";

export interface IStatisticsProcessor {

    /**
     * Processes queue messages from SQS queue for all users.
     */
    processQueueMessages(queueName: string, awsToken: {
        accessTokenId: string;
        secretAccessKey: string;
    }): Promise<Event[]>;

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
    async processQueueMessages(queueName: string, awsToken: {
        accessTokenId: string;
        secretAccessKey: string;
    }, maxNumberOfMessages = 10): Promise<Event[]> {
        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessTokenId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        try {
            const inputGetQueueUrl = { // GetQueueUrlRequest
                QueueName: queueName, // required
            };
            const getQueueUrlCommand = new GetQueueUrlCommand(inputGetQueueUrl);
            const getQueueUrlCommandOutput = await sqsClient.send(getQueueUrlCommand);
            const queueUrl = getQueueUrlCommandOutput.QueueUrl;
            if (!queueUrl) {
                throw new Error("Queue not found");
            }
            const messageIds: string[] = [];
            const parsedEvents: Event[] = [];
            let wasEmpty = false;
            do {
                const input: ReceiveMessageCommandInput = {
                    QueueUrl: queueUrl,
                    MaxNumberOfMessages: maxNumberOfMessages,
                    WaitTimeSeconds: 5,
                    VisibilityTimeout: 10,
                };

                const sendMessageCommand = new ReceiveMessageCommand(input);
                const receiveMessageCommandOutput = await sqsClient.send(sendMessageCommand);
                const messages = receiveMessageCommandOutput.Messages;
                if (messages) {
                    const newEvents: Event[] = messages.map((message) => {
                        // Messages are Event[] arrays
                        return JSON.parse(message.Body as string) as Event[];
                    }).flat(); // Flatten the array of Event arrays
                    messageIds.push(...messages.map((message) => {
                        return message.MessageId as string;
                    })); // Add message IDs to the list
                    parsedEvents.push(...newEvents);
                    wasEmpty = messages.length === 0;
                } else {
                    wasEmpty = true;
                }

            } while (!wasEmpty && parsedEvents.length < maxNumberOfMessages);
            console.log(messageIds);

            return parsedEvents;
        } catch (error) {
            console.log("Error sending statistics: ", error);
        }

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