import { Readable } from "stream";
import type { DynamicCollection, LabeledVector } from "./Collection";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DeleteCommand, DynamoDBDocumentClient, ScanCommand, BatchWriteCommand
} from "@aws-sdk/lib-dynamodb";

export class DynamoCollection implements DynamicCollection {

    private client: DynamoDBClient;
    private docClient: DynamoDBDocumentClient;

    constructor(private options: {
        table: string;
        region: string;
    }) {
        this.client = new DynamoDBClient({ region: this.options.region });
        this.docClient = DynamoDBDocumentClient.from(this.client);
    }

    public async changesAfter(timestamp: number): Promise<LabeledVector[]> {
        const items = await this.docClient.send(new ScanCommand({
            TableName: this.options.table,
            FilterExpression: "timestamp > :timestamp",
            ExpressionAttributeValues: { ":timestamp": timestamp }
        }));

        return items.Items?.map(item => ({
            label: item.label,
            vector: item.vector
        })) ?? [];
    }

    public async add(vectors: LabeledVector[]): Promise<void> {
        console.info(`Adding ${vectors.length} vectors to ${this.options.table}`);

        const items = vectors.map(v => ({
            PutRequest: {
                Item: {
                    label: v.label,
                    vector: v.vector,
                    timestamp: Date.now()
                }
            }
        }));

        await this.docClient.send(new BatchWriteCommand({ RequestItems: { [this.options.table]: items } }));
    }

    public async remove(labels: string[]): Promise<void> {
        console.info(`Removing ${labels.length} vectors from ${this.options.table}`);

        for (const label of labels) {
            await this.docClient.send(new DeleteCommand({
                TableName: this.options.table,
                Key: { label }
            }));
        }
    }

    public async readStream(): Promise<Readable> {
        // download all items from DynamoDB
        const items = await this.docClient.send(new ScanCommand({ TableName: this.options.table }));

        // return a readable stream
        return new Readable({
            objectMode: true,
            read() {
                if (!items.Items) throw new Error("No items found");

                for (const item of items.Items) {
                    this.push({
                        label: item.label,
                        vector: item.vector
                    });
                }
                this.push(null);
            }
        });

    }

}