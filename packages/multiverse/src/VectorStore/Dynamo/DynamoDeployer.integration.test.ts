import { DynamoDB } from "@aws-sdk/client-dynamodb";
import DynamoDeployer from "./DynamoDeployer";

describe("<DynamoDeployer>", () => {

    const dynamo = new DynamoDB({ region: "eu-central-1" });

    const tableName = "multiverse-collections-test" + Math.random().toString(36).substring(2, 10);

    const deployer = new DynamoDeployer({
        region: "eu-central-1",
        tableName
    });

    it("should deploy dynamo", async() => {
        await deployer.deploy();
    });

    it("should destroy dynamo", async() => {
        await deployer.destroy();

        expect(dynamo.describeTable({ TableName: tableName })).rejects.toThrow();
    });
});