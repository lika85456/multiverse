import OrchestratorDeployer from "./OrchestratorDeployer";

describe("<OrchestratorDeployer>", () => {

    const deployer = new OrchestratorDeployer({
        indexConfiguration: {
            dimensions: 1536,
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            space: "cosine",
        },
        stage: "dev",
        changesTable: "test",
        snapshotBucket: "test"
    });

    it("should build code", async() => {
        const code = await deployer.build();

        expect(code).toBeDefined();
    });

    it("should deploy lambda", async() => {
        const arn = await deployer.deploy();

        expect(arn).toBeDefined();
    });

    it("should destroy lambda", async() => {
        await deployer.destroy();
    });
});