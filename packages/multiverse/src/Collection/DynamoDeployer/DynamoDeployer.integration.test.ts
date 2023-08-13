import DynamoDeployer from "./DynamoDeployer";

describe("<DynamoDeployer>", () => {

    const deployer = new DynamoDeployer({
        region: "eu-central-1",
        tableName: "multiverse-collections-test"
    });

    it("should deploy dynamo", async() => {
        await deployer.deploy();
    });

    // afterAll(async() => {
    //     await deployer.destroy();
    // });
});