import type {
    APIGatewayProxyEvent, APIGatewayProxyResult, Context
} from "aws-lambda";
import ChangesStorage from "@multiverse/multiverse/src/ChangesStorage/DynamoChangesStorage";
import { Vector } from "@multiverse/multiverse/src/Vector";

const changesStorage = new ChangesStorage({
    indexName: "mama",
    owner: "papa",
    partition: 1,
    region: "eu-central-1",
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    tableName: process.env.CHANGES_TABLE_NAME!
});

export const handler = async(
    _event: APIGatewayProxyEvent,
    _context: Context
): Promise<APIGatewayProxyResult> => {

    const writePromise = changesStorage.add([{
        action: "add",
        timestamp: Date.now(),
        vector: {
            vector: [1,2,3],
            label: "Maaalabel",
            metadata: { xd: "?" }
        }
    }]);

    let check = 0;
    const changes = [];
    for await (const change of changesStorage.changesAfter(0)) {
        changes.push(change);
        check++;

        if (check > 50) {
            throw "WTFFFF?";
        }
    }

    await writePromise;

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello World",
            changes
        })
    };
};