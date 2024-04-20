import OrchestratorDeployer from "./OrchestratorDeployer";

describe("<OrchestratorDeployer>", () => {

    const deployer = new OrchestratorDeployer({
        databaseConfiguration: {
            dimensions: 1536,
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            space: "cosine",
        },
        changesTable: "multiverse-changes-test",
        snapshotBucket: "multiverse-snapshot-storage-test",
        infrastructureTable: "infrastructure-storage-test"
    });

    it("should build code", async() => {
        const code = await deployer.build();

        expect(code).toBeDefined();
    });

    it("should deploy lambda", async() => {
        const arn = await deployer.deploy();

        expect(arn).toBeDefined();
    });

    it("should update lambda", async() => {
        await deployer.updateCode();
    });

    it("should destroy lambda", async() => {
        await deployer.destroy();
    });
});