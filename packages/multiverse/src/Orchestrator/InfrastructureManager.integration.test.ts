import { Lambda } from "@aws-sdk/client-lambda";
import InfrastructureManager from "./InfrastructureManager";
import InfrastructureStorage, { InfrastructureStorageDeployer } from "./InfrastructureStorage";
import log from "@multiverse/log";
import { DynamoChangesStorageDeployer } from "../ChangesStorage/DynamoChangesStorage";
import { S3SnapshotStorageDeployer } from "../SnapshotStorage/S3SnapshotStorage";

describe("<InfrastructureManager>", () => {
    const manager = new InfrastructureManager({
        indexConfiguration: {
            dimensions: 1536,
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            space: "cosine",
        },
        changesTable: "multiverse-changes-test",
        snapshotBucket: "multiverse-snapshot-storage-test",
        infrastructureStorage: new InfrastructureStorage({
            region: "eu-central-1",
            tableName: "infrastructure-storage-test"
        })
    });

    const infrastructureDeployer = new InfrastructureStorageDeployer({
        region: "eu-central-1",
        tableName: "infrastructure-storage-test",
    });

    const changesTableDeployer = new DynamoChangesStorageDeployer({
        region: "eu-central-1",
        tableName: "multiverse-changes-test",
    });

    const snapshotStorageDeployer = new S3SnapshotStorageDeployer({
        bucketName: "multiverse-snapshot-storage-test",
        region: "eu-central-1"
    });

    beforeAll(async() => {
        if (!(await infrastructureDeployer.exists())) {
            await infrastructureDeployer.deploy();
        }

        if (!(await changesTableDeployer.exists())) {
            await changesTableDeployer.deploy();
        }

        if (!(await snapshotStorageDeployer.exists())) {
            await snapshotStorageDeployer.deploy();
        }
    });

    afterAll(async() => {
        // await Promise.all([
        //     infrastructureDeployer.destroy(),
        //     changesTableDeployer.destroy(),
        //     snapshotStorageDeployer.destroy()
        // ]);
        // await manager.destroy();
    });

    // it("(should )", async() => {
    //     await manager.destroy();
    // });

    it("new infrastructure should be empty", async() => {
        const infrastructure = await manager.getInfrastructure();

        expect(infrastructure).toBeUndefined();
    });

    it("should deploy orchestrator and first partition", async() => {
        await manager.deploy();

        const infrastructure = await manager.getInfrastructure();

        if (!infrastructure) {
            throw new Error("Infrastructure not found");
        }

        expect(infrastructure.partitions.length).toBe(1);

        // TODO: check that the orchestrator can query
    });

    it("should add partition", async() => {
        await manager.addPartition();

        const infrastructure = await manager.getInfrastructure();

        if (!infrastructure) {
            throw new Error("Infrastructure not found");
        }

        expect(infrastructure.partitions.length).toBe(2);

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