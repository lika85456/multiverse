import type { Stack } from "sst/constructs";
import {
    AttributeType, BillingMode, Table
} from "aws-cdk-lib/aws-dynamodb";

export function DynamoChangesStorageStack(stack: Stack) {
    const table = new Table(stack, "changes", {
        partitionKey: {
            name: "PK",
            type: AttributeType.STRING
        },
        sortKey: {
            name: "SK",
            type: AttributeType.NUMBER
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        timeToLiveAttribute: "ttl"
    });

    return table;
}