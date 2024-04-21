import { getSessionUser } from "@/lib/mongodb/collections/user";
import { generateHex } from "@/lib/multiverse-interface/MultiverseMock";
import { GetQueueAttributesCommand } from "@aws-sdk/client-sqs";
import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import {
    CreateQueueCommand, DeleteQueueCommand, GetQueueUrlCommand, SQSClient
} from "@aws-sdk/client-sqs";
import { getAwsTokenById } from "@/lib/mongodb/collections/aws-token";
import type { Event } from "@/lib/statistics-processor/event";
import log from "@multiverse/log";
import { MessageCollector } from "@/lib/statistics-processor/MessageCollector";

const MAX_NUMBER_OF_MESSAGES = 10;

const MIN_NUMBER_OF_RETRIEVERS = 5;

export class SQSHandler {
    private readonly startTime: number;
    private readonly queueName: string;
    private readonly queueUrlPromise: Promise<string>;
    // private readonly awsToken: {
    //     accessKeyId: string;
    //     secretAccessKey: string;
    // };

    private readonly sqsClient: SQSClient;

    constructor(startTime: number = performance.now(), queueName: string, awsToken: { accessKeyId: string; secretAccessKey: string; }) {
        this.startTime = startTime;
        this.queueName = queueName;
        // this.awsToken = awsToken;
        this.sqsClient = new SQSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });
        this.queueUrlPromise = this.getQueueUrl(queueName, this.sqsClient);
    }

    /**
     * Deletes messages from the SQS queue using the provided receipt handles.
     * Messages are deleted asynchronously.
     * @param receiptHandles
     */
    deleteMessagesWithHandles(receiptHandles: string[]): void {
        let deletedMessages = 0;
        Promise.all(receiptHandles.map(async(receiptHandle) => {
            try {
                await this.sqsClient.send(new DeleteMessageCommand({
                    QueueUrl: await this.queueUrlPromise,
                    ReceiptHandle: receiptHandle,
                }));
                deletedMessages++;
            } catch (error) {
                // don't intercept to continue deleting other messages
                log.error(`${(performance.now() - this.startTime) / 1000} | Error deleting message: ${error}`);
            }
        })).catch((error) => {
            log.error(`${(performance.now() - this.startTime) / 1000} | Error deleting messages: ${error}`);
        }).finally(() => {
            log.info(`${(performance.now() - this.startTime) / 1000} | Deleted ${deletedMessages} messages.`);
        });
    }

    /**
     * Asynchronously retrieves messages from the SQS queue. Messages are collected into a message collector.
     * The number of messages retrieved is returned.
     * @param messageCollector
     */
    async retrieveMessages(messageCollector: MessageCollector): Promise<number> {
        const sendMessageCommand = new ReceiveMessageCommand({
            QueueUrl: await this.queueUrlPromise,
            MaxNumberOfMessages: MAX_NUMBER_OF_MESSAGES,
            WaitTimeSeconds: 5,
            VisibilityTimeout: 10,
        });
        const receiveMessageCommandOutput = await this.sqsClient.send(sendMessageCommand);
        const messages = receiveMessageCommandOutput.Messages;
        if (!messages) {
            return 0;
        }

        return messages.reduce((acc, message) => {
            try {
                const messageEvents = JSON.parse(message.Body as string) as Event[];
                const messageReceiptHandler = message.ReceiptHandle as string;

                messageCollector.addMessage(message.MessageId as string, {
                    events: messageEvents,
                    receiptHandler: messageReceiptHandler
                });

                return acc++;
            } catch (error) {
                log.error("Error parsing message: ", error);

                return acc;
            }
        }, 0);
    }

    /**
     * Asynchronously retrieves the URL of the SQS queue.
     * @param queueName - the name of the SQS queue
     * @param sqsClient - the SQS client
     */
    async getQueueUrl(queueName: string, sqsClient: SQSClient): Promise<string> {
        const getQueueUrlCommand = new GetQueueUrlCommand({ QueueName: queueName, });
        const getQueueUrlCommandOutput = await sqsClient.send(getQueueUrlCommand);
        const queueUrl = getQueueUrlCommandOutput.QueueUrl;
        if (!queueUrl) {
            throw new Error("Queue not found");
        }

        return queueUrl;
    }

    /**
     * Asynchronously retrieves the approximate number of messages in the SQS queue.
     */
    async getApproximateNumberOfMessages(): Promise<number> {
        const command = new GetQueueAttributesCommand({
            QueueUrl: await this.queueUrlPromise,
            AttributeNames: ["ApproximateNumberOfMessages"],
        });
        const getQueueAttributesCommandOutput = await this.sqsClient.send(command);

        return Number(getQueueAttributesCommandOutput.Attributes?.ApproximateNumberOfMessages ?? 0);
    }

    /**
     * Asynchronously processes queue messages from the SQS queue. AWS Token is required to authenticate the request.
     * This method is not designed to be awaited (to not block the processing of other queues), but it can be awaited
     * if needed. By the approximate number of messages in the queue, the number of retrievers is calculated to process
     * the messages. The messages are retrieved in parallel by the retrievers and collected into a message collector.
     * When all retrievers have finished, the messages are processed asynchronously.
     */
    async processQueue(): Promise<void> {
        // get the approximate number of messages in the queue to calculate required retrievers
        const approximateNumberOfMessages = await this.getApproximateNumberOfMessages();

        // terminate if there are no messages in the queue
        if (approximateNumberOfMessages === 0) {
            log.info(`No messages in the queue ${this.queueName}`);

            return;
        }
        const numberOfRetrievers = Math.ceil(approximateNumberOfMessages / MAX_NUMBER_OF_MESSAGES) + MIN_NUMBER_OF_RETRIEVERS;

        // log the number of messages and retrievers
        log.debug(`Approximate number of messages: ${approximateNumberOfMessages}`);
        log.debug(`Number of retrievers: ${numberOfRetrievers}`);

        // create a message collector
        const messageCollector = new MessageCollector(
            this.queueName,
            numberOfRetrievers,
            this.deleteMessagesWithHandles.bind(this),
            this.startTime
        );

        // start the asynchronous retrievers
        for (let i = 0; i < numberOfRetrievers; i++) {
            this.retrieveMessages(messageCollector).then(() => {
                // log.debug(`Retriever ${i} queue ${queueName}: FINISHED - ${messageCount} messages.`);
            }).catch((error) => {
                log.error(`Retriever ${i} queue ${this.queueName}: FAILED   - ${error}`);
            }).finally(() => {
                // signal that the retriever has finished
                messageCollector.signalFinished();
            });
        }
    }

    /**
     * Creates a new SQS queue.
     * Authenticated user's AWS Token is required to authenticate the request.
     */
    static async createQueue(): Promise<string> {
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

    /**
     * Deletes the SQS queue.
     * Authenticated user's AWS Token is required to authenticate the request.
     */
    static async deleteQueue(): Promise<void> {
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