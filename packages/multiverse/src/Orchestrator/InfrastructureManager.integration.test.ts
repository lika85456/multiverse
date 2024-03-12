import { Lambda } from "@aws-sdk/client-lambda";
import InfrastructureManager from "./InfrastructureManager";
import InfrastructureStorage, { InfrastructureStorageDeployer } from "../InfrastructureStorage/InfrastructureStorage";
import log from "@multiverse/log";
import { DynamoChangesStorageDeployer } from "../ChangesStorage/DynamoChangesStorage";
import { S3SnapshotStorageDeployer } from "../SnapshotStorage/S3SnapshotStorage";

describe("<InfrastructureManager>", () => {

    const changesTableName = "multiverse-changes-test-" + Math.random().toString(36).substring(7);
    const snapshotBucketName = "multiverse-snapshot-storage-test-" + Math.random().toString(36).substring(7);
    const infrastructureTableName = "infrastructure-storage-test-" + Math.random().toString(36).substring(7);

    const manager = new InfrastructureManager({
        indexConfiguration: {
            dimensions: 1536,
            indexName: "test",
            owner: "test",
            region: "eu-central-1",
            space: "cosine",
        },
        changesTable: changesTableName,
        snapshotBucket: snapshotBucketName,
        infrastructureStorage: new InfrastructureStorage({
            region: "eu-central-1",
            tableName: infrastructureTableName,
        })
    });

    const infrastructureDeployer = new InfrastructureStorageDeployer({
        region: "eu-central-1",
        tableName: infrastructureTableName,
    });

    const changesTableDeployer = new DynamoChangesStorageDeployer({
        region: "eu-central-1",
        tableName: changesTableName,
    });

    const snapshotStorageDeployer = new S3SnapshotStorageDeployer({
        region: "eu-central-1",
        bucketName: snapshotBucketName,
    });

    beforeAll(async() => {
        if (await infrastructureDeployer.exists() || await changesTableDeployer.exists() || await snapshotStorageDeployer.exists()) {
            throw new Error("One of the resources already exists");
        }

        await Promise.all([
            infrastructureDeployer.deploy(),
            changesTableDeployer.deploy(),
            snapshotStorageDeployer.deploy()
        ]);
    });

    afterAll(async() => {
        await manager.destroy().catch(log.error);
        await Promise.all([
            infrastructureDeployer.destroy().catch(log.error),
            changesTableDeployer.destroy().catch(log.error),
            snapshotStorageDeployer.destroy().catch(log.error)
        ]);
    });

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