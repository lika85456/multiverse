import DynamoDeployer from "./DynamoDeployer";

describe("<DynamoDeployer>", () => {

    const deployer = new DynamoDeployer({
        collection: {
            collectionName: "test",
            dimensions: 3,
            type: "dynamic"
        },
        database: {
            databaseName: `test-${Date.now()}`,
            mainRegion: "eu-central-1",
            secondaryRegions: [],
            awakeInstances: 1
        }
    });

    it("should deploy dynamo", async() => {
        await deployer.deploy();
    });

    afterAll(async() => {
        await deployer.destroy();
    });
});