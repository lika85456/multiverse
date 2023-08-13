import { DynamoDB } from "@aws-sdk/client-dynamodb";

export default class DynamoDeployer {

    private dynamo: DynamoDB;

    constructor(private options: {
        region: string;
        tableName: string;
    }) {
        this.dynamo = new DynamoDB({ region: options.region });
    }

    public async deploy() {
        await this.createDatabaseTable();
        await this.waitUntilActive(this.options.tableName);
        await this.testTable(this.options.tableName);
    }

    public async destroy() {
        await this.dynamo.deleteTable({ TableName: this.options.tableName });
    }

    private async createDatabaseTable() {
        await this.dynamo.createTable({
            TableName: this.options.tableName,
            KeySchema: [
                {
                    AttributeName: "PK",
                    KeyType: "HASH"
                },
                {
                    AttributeName: "id",
                    KeyType: "RANGE"
                },
            ],
            AttributeDefinitions: [
                {
                    AttributeName: "PK",
                    AttributeType: "S"
                },
                {
                    AttributeName: "id",
                    AttributeType: "N"
                },
                {
                    AttributeName: "label",
                    AttributeType: "S"
                },
                {
                    AttributeName: "lastUpdate",
                    AttributeType: "N"
                },
                // {
                //     AttributeName: "deactivated",
                //     AttributeType: "N"
                // },
                // {
                //     AttributeName: "activeVectors",
                //     AttributeType: "N"
                // },
                // {
                //     AttributeName: "totalVectors",
                //     AttributeType: "N"
                // },
                // {
                //     AttributeName: "vector",
                //     AttributeType: "B"
                // },
            ],
            BillingMode: "PAY_PER_REQUEST",
            GlobalSecondaryIndexes: [
                // {
                //     IndexName: "PK-deactivated-index",
                //     KeySchema: [
                //         {
                //             AttributeName: "PK",
                //             KeyType: "HASH"
                //         },
                //         {
                //             AttributeName: "deactivated",
                //             KeyType: "RANGE"
                //         },
                //     ],
                //     Projection: {
                //         ProjectionType: "INCLUDE",
                //         NonKeyAttributes: [
                //             "id",
                //             "lastUpdate"
                //         ]
                //     }
                // },
                {
                    IndexName: "PK-label-index",
                    KeySchema: [
                        {
                            AttributeName: "PK",
                            KeyType: "HASH"
                        },
                        {
                            AttributeName: "label",
                            KeyType: "RANGE"
                        },
                    ],
                    Projection: { ProjectionType: "ALL", }
                },
                {
                    IndexName: "PK-lastUpdate-index",
                    KeySchema: [
                        {
                            AttributeName: "PK",
                            KeyType: "HASH"
                        },
                        {
                            AttributeName: "lastUpdate",
                            KeyType: "RANGE"
                        }
                    ],
                    Projection: { ProjectionType: "ALL", }

                }
            ]
        });

        console.debug(`Dynamo ${this.options.tableName} initialized`);
    }

    private async waitUntilActive(tableName: string) {
        let state = (await this.dynamo.describeTable({ TableName: tableName }))?.Table?.TableStatus;

        while (state !== "ACTIVE") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { Table } = await this.dynamo.describeTable({ TableName: tableName });
            state = Table?.TableStatus;
            console.debug(`${tableName} state: ${state}`);
        }
    }

    private async testTable(tableName: string) {
        // scan and read 0
        const scanResult = await this.dynamo.scan({
            TableName: tableName,
            Limit: 1
        });
        if (scanResult.Count !== 0) {
            throw new Error("Table is not empty");
        }
    }
}