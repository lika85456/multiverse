import type { AwsToken } from "../core/AwsToken";
import type { Region } from "../core/DatabaseConfiguration";
import type { StatisticsEvent } from "../core/Events";
import type StatisticsQueue from "./StatisticsQueue";
import { SQS } from "@aws-sdk/client-sqs";
import { Consumer } from "sqs-consumer";

export default class SQSSStatisticsQueue implements StatisticsQueue {
    private sqs: SQS;

    constructor(private options: {
        awsToken?: AwsToken
        region: Region
        queueUrl?: string
        queueName?: string
    }) {
        this.sqs = new SQS({
            credentials: options.awsToken,
            region: options.region
        });
    }

    private async getQueueUrl(): Promise<string> {
        if (this.options.queueUrl) {
            return this.options.queueUrl;
        }

        const response = await this.sqs.getQueueUrl({ QueueName: this.options.queueName });

        if (!response.QueueUrl) {
            throw new Error("Queue URL not found in getQueueUrl response");
        }

        this.options.queueUrl = response.QueueUrl;

        return response.QueueUrl;
    }

    public async push(event: StatisticsEvent): Promise<void> {
        await this.sqs.sendMessage({
            QueueUrl: await this.getQueueUrl(),
            MessageBody: JSON.stringify(event)
        });
    }

    public async receiveMessages(stopAtTimestamp: number, eventsLimit: number): Promise<(StatisticsEvent & {
        MessageId: string,
        ReceiptHandle: string
    })[]> {

        const queueUrl = await this.getQueueUrl();

        const events: (StatisticsEvent & {
            MessageId: string,
            ReceiptHandle: string
        })[] = [];

        const app = Consumer.create({
            queueUrl,
            handleMessage: async(message) => {
                if (!message.Body || !message.MessageId) {
                    return;
                }

                const event = JSON.parse(message.Body) as StatisticsEvent;

                events.push({
                    ...event,
                    MessageId: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle ?? ""
                });

                if (events.length >= eventsLimit) {
                    app.stop();
                }
            },
            sqs: this.sqs,
            batchSize: 10,
            shouldDeleteMessages: false,
        });

        app.start();

        setTimeout(() => {
            try {
                app.stop();
            } catch (_e) {
                // noop
            }
        }, stopAtTimestamp - Date.now());

        return new Promise((resolve) => {
            app.on("stopped", () => {
                resolve(events);
            });
        });
    }

    public async removeMessages(messagesToDelete: {messageId: string, receiptHandle: string}[]): Promise<void> {
        await Promise.all(Array.from({ length: Math.ceil(messagesToDelete.length / 10) }, (_, i) => {
            return this.sqs.deleteMessageBatch({
                QueueUrl: this.options.queueUrl,
                Entries: messagesToDelete.slice(i * 10, (i + 1) * 10).map(id => ({
                    Id: id.messageId,
                    ReceiptHandle: id.receiptHandle
                }))
            });
        }));
    }

    public async deploy(options?: { queueName: string}): Promise<string> {
        if (!(options?.queueName ?? this.options.queueName)) {
            throw new Error("queueName is required");
        }

        const result = await this.sqs.createQueue({ QueueName: options?.queueName ?? this.options.queueName });

        if (!result.QueueUrl) {
            throw new Error("Queue URL not found in createQueue response");
        }

        this.options.queueUrl = result.QueueUrl;

        return result.QueueUrl;
    }

    public async destroy() {
        await this.sqs.deleteQueue({ QueueUrl: await this.getQueueUrl() });
    }
}