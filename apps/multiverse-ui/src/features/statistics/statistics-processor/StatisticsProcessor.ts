import { getSessionUser } from "@/lib/mongodb/collections/user";
import { generateHex } from "@/server/multiverse-interface/MultiverseMock";
import type { ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
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

    private deleteMessagesWithHandles(queueUrl: string, receiptHandles: string[], sqsClient: SQSClient): void {
        receiptHandles.forEach(async(receiptHandle) => {
            const inputDeleteMessage = {
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle,
            };
            try {
                await sqsClient.send(new DeleteMessageCommand(inputDeleteMessage));
            } catch (error) {
                console.error("Error deleting message: ", error);
            }
        });
    }

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
            const parsedEvents = new Map<string, Event[]>;
            const receiptHandles: string[] = [];
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
                    messages.forEach((message) => {
                        // Messages are Event[] arrays
                        try {
                            const messageEvents = JSON.parse(message.Body as string) as Event[];
                            parsedEvents.set(message.MessageId as string, messageEvents);
                            receiptHandles.push(message.ReceiptHandle as string);
                        } catch (error) {
                            console.error("Error parsing message: ", error);

                            return;
                        }

                    }); // Flatten the array of Event arrays
                    wasEmpty = messages.length === 0;
                } else {
                    wasEmpty = true;
                }

            } while (!wasEmpty && parsedEvents.size < maxNumberOfMessages);
            this.deleteMessagesWithHandles(queueUrl, receiptHandles, sqsClient);

            return Array.from(parsedEvents.values()).flat();
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