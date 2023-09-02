import type { Stack } from "sst/constructs";
import {
    AttributeType, BillingMode, Table
} from "aws-cdk-lib/aws-dynamodb";

export default function DynamoChangesStorageStack(stack: Stack) {
    const table = new Table(stack, "multiverse-changes", {
        partitionKey: {
            name: "PK",
            type: AttributeType.STRING
        },
        sortKey: {
            name: "SK",
            type: AttributeType.NUMBER
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        // todo!: add time to live attribute
        // timeToLiveAttribute
    });

    return table;
}