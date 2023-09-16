import { Lambda } from "@aws-sdk/client-lambda";
import InfrastructureManager from "./InfrastructureManager";
import InfrastructureStorage, { InfrastructureStorageDeployer } from "./InfrastructureStorage";
import log from "@multiverse/log";

describe("<InfrastructureManager>", () => {
    const manager = new InfrastructureManager({
        indexConfiguration: {
            dimensions: 1536,
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            space: "cosine",
        },
        changesTable: "test",
        snapshotBucket: "test",
        orchestratorLambdaName: "test",
        infrastructureStorage: new InfrastructureStorage({
            region: "eu-central-1",
            stage: "dev",
            tableName: "infrastructure-storage-test"
        })
    });

    const deployer = new InfrastructureStorageDeployer({
        region: "eu-central-1",
        tableName: "infrastructure-storage-test",
    });

    beforeAll(async() => {
        if (!(await deployer.exists())) {
            await deployer.deploy();
        }
    });

    afterAll(async() => {
        // await deployer.destroy();
        await manager.destroy();
    });

    it("should get infrastructure", async() => {
        const infrastructure = await manager.getInfrastructure();

        expect(infrastructure).toBeDefined();
        expect(infrastructure.partitions.length).toBe(0);
        expect(infrastructure.configuration.indexName).toBe("test");
    });

    it("should add partition", async() => {
        await manager.addPartition();

        const infrastructure = await manager.getInfrastructure();

        expect(infrastructure.partitions.length).toBe(1);

        // check that the partition can query
        const partition = infrastructure.partitions[0];

        const lambda = new Lambda({ region: "eu-central-1" });

        const result = await lambda.invoke({
            FunctionName: partition.lambda[0].name,
            Payload: JSON.stringify({
                body: JSON.stringify({
                    event: "query",
                    payload: [{
                        query: {
                            // 1536 dimensions
                            vector: Array.from({ length: 1536 }, () => Math.random()),
                            k: 10
                        },
                    }]
                })
            })
        });

        const uintPayload = new Uint8Array(result.Payload as ArrayBuffer);

        log.debug("result", { result: JSON.parse(Buffer.from(uintPayload).toString("utf-8")) });

    });
});