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
        MessageId: string
    })[]> {

        const events: (StatisticsEvent & { MessageId: string })[] = [];

        const app = Consumer.create({
            queueUrl: await this.getQueueUrl(),
            handleMessage: async(message) => {
                if (!message.Body || !message.MessageId) {
                    return;
                }

                const event = JSON.parse(message.Body) as StatisticsEvent;

                events.push({
                    ...event,
                    MessageId: message.MessageId
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

        // at stopAtTimeout stop the consumer if not stopped already
        setTimeout(() => {
            try {
                app.stop();
            } catch (_e) {

            }
        }, stopAtTimestamp - Date.now());

        app.on("stopped", () => {
            
        });
    }

    public async deploy({ queueName }: { queueName: string}): Promise<string> {
        const result = await this.sqs.createQueue({ QueueName: queueName });

        if (!result.QueueUrl) {
            throw new Error("Queue URL not found in createQueue response");
        }

        this.options.queueUrl = result.QueueUrl;

        return result.QueueUrl;
    }

    public async destroy() {
        await this.sqs.deleteQueue({ QueueUrl: this.options.queueUrl });
    }
}