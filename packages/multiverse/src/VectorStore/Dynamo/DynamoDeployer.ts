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

        const start = Date.now();

        // wait until table is deleted
        while (Date.now() - start < 1000 * 60) {
            try {
                await this.dynamo.describeTable({ TableName: this.options.tableName });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.debug(`Dynamo ${this.options.tableName} destroyed`);

                return;
            }
        }

        throw new Error(`Dynamo ${this.options.tableName} destroy timeout`);
    }

    // type UserName = string;
    // type DatabaseName = string;
    // type Partition = number;

    // export type Stats = {
    //     PK: `${UserName}-${DatabaseName}`;
    //     SK: "STATS";
    //     totalVectors: number;
    //     activeVectors: number;
    //     partitions: number;
    // };

    // export type Vector = {
    //     PK: `${UserName}-${DatabaseName}#${Partition}`;
    //     SK: string; // random long id
    //     label: string;
    //     vector: number[]; // or binary data?
    //     updated: number; // timestamp
    //     deactivated?: number | boolean;
    //     metadata: string; // anything
    // };

    private async createDatabaseTable() {
        await this.dynamo.createTable({
            TableName: this.options.tableName,
            KeySchema: [
                {
                    AttributeName: "PK",
                    KeyType: "HASH"
                },
                {
                    AttributeName: "SK",
                    KeyType: "RANGE"
                },
            ],
            AttributeDefinitions: [
                {
                    AttributeName: "PK",
                    AttributeType: "S"
                },
                {
                    AttributeName: "SK",
                    AttributeType: "S"
                },
                {
                    AttributeName: "updated",
                    AttributeType: "N"
                },
                {
                    AttributeName: "label",
                    AttributeType: "S"
                },
            ],
            BillingMode: "PAY_PER_REQUEST",
            GlobalSecondaryIndexes: [
                {
                    IndexName: "PK-updated-index",
                    KeySchema: [
                        {
                            AttributeName: "PK",
                            KeyType: "HASH"
                        },
                        {
                            AttributeName: "updated",
                            KeyType: "RANGE"
                        },
                    ],
                    Projection: {
                        ProjectionType: "INCLUDE",
                        NonKeyAttributes: [
                            "label",
                            "vector",
                            "deactivated",
                            "metadata",
                            "SK"
                        ]
                    }
                },
                {
                    IndexName: "label-PK-index",
                    KeySchema: [
                        {
                            AttributeName: "label",
                            KeyType: "HASH"
                        },
                        {
                            AttributeName: "PK",
                            KeyType: "RANGE"
                        },
                    ],
                    Projection: {
                        ProjectionType: "INCLUDE",
                        NonKeyAttributes: [
                            "SK"
                        ]
                    }
                }
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
                // {
                //     IndexName: "PK-label-index",
                //     KeySchema: [
                //         {
                //             AttributeName: "PK",
                //             KeyType: "HASH"
                //         },
                //         {
                //             AttributeName: "label",
                //             KeyType: "RANGE"
                //         },
                //     ],
                //     Projection: { ProjectionType: "ALL", }
                // },
                // {
                //     IndexName: "PK-lastUpdate-index",
                //     KeySchema: [
                //         {
                //             AttributeName: "PK",
                //             KeyType: "HASH"
                //         },
                //         {
                //             AttributeName: "lastUpdate",
                //             KeyType: "RANGE"
                //         }
                //     ],
                //     Projection: { ProjectionType: "ALL", }
                // }
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