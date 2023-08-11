import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { ENV } from "../../env";

const dynamo = new DynamoDB({ region: "eu-central-1" });

const tableName = ENV.COLLECTIONS_TABLE;

// | PrimaryKey     |                                |                 |              |          |             |           |
// | -------------- | ------------------------------ | --------------- | ------------ | -------- | ----------- | --------- |
// | PK - Partition | SK                             |                 |              |          |             |           |
// | USER#          | STAT#my-database               | activeVectors   | totalVectors |          |             |           |
// |                |                                | 2               | 3            |          |             |           |
// |                |                                | vector (base64) | label        | updated  | deactivated | pid       |
// |                | V#my-database#2505c14d25ba5b07 | [1,2,3]         | My text      | 80846484 |             | 0.9819884 |
// |                | V#my-database#7c740b1da30d969a | [4,5,6]         | My test      | 80846485 | true        | 0.2135415 |
// |                | V#my-database#dafaf99efe354835 | [6,7,8]         | My car       | 80846485 |             | 0.0518498 |
// |                |                                |                 |              |          |             |           |
// |                |                                |                 |              |          |             |           |

export default class DynamoDeployer {

    public async deploy() {
        await this.createDatabaseTable();
        await this.waitUntilActive(tableName);
        await this.testTable(tableName);
    }

    public async destroy() {
        await dynamo.deleteTable({ TableName: tableName });
    }

    private async createDatabaseTable() {
        await dynamo.createTable({
            TableName: tableName,
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
                // {
                //     AttributeName: "label",
                //     AttributeType: "S"
                // },
                // {
                //     AttributeName: "updated",
                //     AttributeType: "N"
                // },
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
            BillingMode: "PAY_PER_REQUEST"
        });

        console.debug(`Dynamo ${tableName} initialized`);
    }

    private async waitUntilActive(tableName: string) {
        let state = (await dynamo.describeTable({ TableName: tableName }))?.Table?.TableStatus;

        while (state !== "ACTIVE") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { Table } = await dynamo.describeTable({ TableName: tableName });
            state = Table?.TableStatus;
            console.debug(`${tableName} state: ${state}`);
        }
    }

    private async testTable(tableName: string) {
        // scan and read 0
        const scanResult = await dynamo.scan({
            TableName: tableName,
            Limit: 1
        });
        if (scanResult.Count !== 0) {
            throw new Error("Table is not empty");
        }
    }
}