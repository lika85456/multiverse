import DynamoDeployer from "./DynamoDeployer";

describe("<DynamoDeployer>", () => {

    const deployer = new DynamoDeployer();

    it("should deploy dynamo", async() => {
        await deployer.deploy();
    });

    // afterAll(async() => {
    //     await deployer.destroy();
    // });
});