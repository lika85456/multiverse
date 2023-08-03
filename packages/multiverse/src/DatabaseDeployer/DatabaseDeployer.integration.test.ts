import DatabaseDeployer from "./DatabaseDeployer";

describe("<DatabaseDeployer>", () => {

    const deployer = new DatabaseDeployer({
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

    it("should deploy function", async() => {
        await deployer.deploy();
    });

    afterAll(async() => {
        await deployer.destroy();
    });
});