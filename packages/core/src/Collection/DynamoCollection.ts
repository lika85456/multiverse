import { Readable } from "stream";
import type { DynamicCollection, LabeledVector } from "./Collection";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    UpdateCommand, DynamoDBDocumentClient, ScanCommand, BatchWriteCommand
} from "@aws-sdk/lib-dynamodb";

export class DynamoCollection implements DynamicCollection {

    private client: DynamoDBClient;
    private docClient: DynamoDBDocumentClient;

    constructor(private options: {
        table: string;
        region: string;
        dimensions: number;
    }) {
        this.client = new DynamoDBClient({ region: this.options.region });
        this.docClient = DynamoDBDocumentClient.from(this.client);
    }

    public async dimensions(): Promise<number> {
        return this.options.dimensions;
    }

    public async size(): Promise<number> {
        const items = await this.docClient.send(new ScanCommand({
            TableName: this.options.table,
            Select: "COUNT"
        }));

        return items.Count ?? 0;
    }

    public async changesAfter(timestamp: number): Promise<(LabeledVector & {deactivated?: true})[]> {
        const items = await this.docClient.send(new ScanCommand({
            TableName: this.options.table,
            FilterExpression: "#timestamp > :timestamp",
            ExpressionAttributeNames: { "#timestamp": "timestamp" },
            ExpressionAttributeValues: { ":timestamp": timestamp }
        }));

        return items.Items?.map(item => ({
            label: item.label,
            vector: item.vector,
            deactivated: item.deactivated
        })) ?? [];
    }

    public async add(vectors: LabeledVector[], timestamp = Date.now()): Promise<void> {
        console.info(`Adding ${vectors.length} vectors to ${this.options.table}`);

        const items = vectors.map(v => ({
            PutRequest: {
                Item: {
                    label: v.label,
                    vector: v.vector,
                    timestamp
                }
            }
        }));

        await this.docClient.send(new BatchWriteCommand({ RequestItems: { [this.options.table]: items } }));
    }

    public async remove(labels: number[]): Promise<void> {
        console.info(`Deactivating ${labels.length} vectors from ${this.options.table}`);

        for (const label of labels) {
            await this.docClient.send(new UpdateCommand({
                TableName: this.options.table,
                Key: { label },
                UpdateExpression: "SET deactivated = :deactivated, #timestamp = :timestamp",
                ExpressionAttributeNames: { "#timestamp": "timestamp" },
                ExpressionAttributeValues: {
                    ":deactivated": true,
                    ":timestamp": Date.now()
                }
            }));
        }
    }

    public async cleanupRemoved() {
        // delete all where deactivated = true
        const items = await this.docClient.send(new ScanCommand({
            TableName: this.options.table,
            FilterExpression: "deactivated = :deactivated",
            ExpressionAttributeValues: { ":deactivated": true }
        }));

        const labels = items.Items?.map(item => item.label) ?? [];

        if (labels.length > 0) {
            console.info(`Deleting ${labels.length} vectors from ${this.options.table}`);

            const items = labels.map(label => ({ DeleteRequest: { Key: { label } } }));

            await this.docClient.send(new BatchWriteCommand({ RequestItems: { [this.options.table]: items } }));
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