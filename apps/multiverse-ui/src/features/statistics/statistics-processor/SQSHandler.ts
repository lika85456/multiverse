import { getSessionUser } from "@/lib/mongodb/collections/user";
import { generateHex } from "@/server/multiverse-interface/MultiverseMock";
import type { ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import {
    CreateQueueCommand, DeleteQueueCommand, GetQueueUrlCommand, SQSClient
} from "@aws-sdk/client-sqs";
import { getAwsTokenById } from "@/lib/mongodb/collections/aws-token";
import type { Event } from "@/features/statistics/statistics-processor/event";
import log from "@multiverse/log";

export interface ISQSHandler {

    /**
     * Processes queue messages from SQS queue for all users.
     */
    receiveMessages(queueName: string, awsToken: {
        accessKeyId: string;
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

export class SQSHandler implements ISQSHandler {

    private deleteMessagesWithHandles(queueUrl: string, receiptHandles: string[], sqsClient: SQSClient): void {
        receiptHandles.forEach(async(receiptHandle) => {
            const inputDeleteMessage = {
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle,
            };
            try {
                await sqsClient.send(new DeleteMessageCommand(inputDeleteMessage));
            } catch (error) {
                log.error("Error deleting message: ", error);
            }
        });
    }

    async receiveMessages(queueName: string, awsToken: {
        accessKeyId: string;
        secretAccessKey: string;
    }, maxNumberOfMessages = 10): Promise<Event[]> {
        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        try {
            const getQueueUrlCommand = new GetQueueUrlCommand({ // GetQueueUrlRequest
                QueueName: queueName, // required
            });
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
                            log.error("Error parsing message: ", error);

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
            log.error("Error sending statistics: ", error);
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

        const awsToken = await getAwsTokenById(sessionUser.awsToken);
        if (!awsToken) {
            throw new Error("AWS Token not found");
        }

        const queueName = `multiverse_${awsToken._id}_${generateHex(8)}`;

        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        const createQueueCommand = new CreateQueueCommand({
            QueueName: queueName,
            tags: {
                multiverse: "multiverse",
                "multiverse:databaseCodeName": "test"
            }
        });
        log.info("Creating queue: ", queueName);
        try {
            await sqsClient.send(createQueueCommand);
        } catch (error) {
            log.error("Error creating queue: ", error);
            throw error;
        }
        log.info("Queue created: ", queueName);

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

        const awsToken = await getAwsTokenById(sessionUser.awsToken);
        if (!awsToken) {
            throw new Error("AWS Token not found");
        }

        const sqsQueue = sessionUser.sqsQueue;

        const sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        const getQueueUrlCommand = new GetQueueUrlCommand({ // GetQueueUrlRequest
            QueueName: sqsQueue, // required
        });
        const getQueueUrlCommandOutput = await sqsClient.send(getQueueUrlCommand);
        const queueUrl = getQueueUrlCommandOutput.QueueUrl;
        if (!queueUrl) {
            throw new Error("Queue not found");
        }
        const deleteQueueCommand = new DeleteQueueCommand({ QueueUrl: queueUrl });
        try {
            await sqsClient.send(deleteQueueCommand);
            log.info("Queue deleted: ", sqsQueue);
        } catch (error) {
            log.error("Error creating queue: ", error);
            throw error;
        }
    }
}