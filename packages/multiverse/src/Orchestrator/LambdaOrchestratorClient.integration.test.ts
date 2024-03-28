import log from "@multiverse/log";
import { Vector } from "../core/Vector";
import LambdaOrchestratorClient from "./LambdaOrchestratorClient";
import { DynamoChangesStorageDeployer } from "../ChangesStorage/DynamoChangesStorage";
import { S3SnapshotStorageDeployer } from "../SnapshotStorage/S3SnapshotStorage";
import InfrastructureManager from "./InfrastructureManager";
import InfrastructureStorage, { InfrastructureStorageDeployer } from "../InfrastructureStorage/DynamoInfrastructureStorage";
import type { DatabaseConfiguration } from "../DatabaseConfiguration";

describe.skip("<LambdaOrchestratorClient>", () => {
    // const changesTableName = "multiverse-changes-test-" + Math.random().toString(36).substring(7);
    // const snapshotBucketName = "multiverse-snapshot-storage-test-" + Math.random().toString(36).substring(7);
    // const infrastructureTableName = "infrastructure-storage-test-" + Math.random().toString(36).substring(7);

    const changesTableName = "multiverse-changes-test-1";
    const snapshotBucketName = "multiverse-snapshot-storage-test-1";
    const infrastructureTableName = "infrastructure-storage-test-1";

    const indexConfiguration: IndexConfiguration = {
        dimensions: 1536,
        indexName: "test",
        owner: "test",
        region: "eu-central-1",
        space: "cosine",
    };

    const manager = new InfrastructureManager({
        indexConfiguration,
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
        // if (await infrastructureDeployer.exists() || await changesTableDeployer.exists() || await snapshotStorageDeployer.exists()) {
        //     throw new Error("One of the resources already exists");
        // }

        // await Promise.all([
        //     infrastructureDeployer.deploy(),
        //     changesTableDeployer.deploy(),
        //     snapshotStorageDeployer.deploy()
        // ]);

        // await manager.deploy();
    });

    // afterAll(async() => {
    //     await manager.destroy().catch(log.error);
    //     await Promise.all([
    //         infrastructureDeployer.destroy().catch(log.error),
    //         changesTableDeployer.destroy().catch(log.error),
    //         snapshotStorageDeployer.destroy().catch(log.error)
    //     ]);
    // });

    const client = new LambdaOrchestratorClient({ indexConfiguration, });

    it("should wait", async() => {
        await client.wake();
    });

    it("should query empty", async() => {
        const result = await client.query({
            k: 10,
            vector: Vector.random(1536),
        });

        log.debug("Query result", { result });
        expect(result.result.length).toBe(0);
    });

    const addedVector = Vector.random(1536);

    it("should add vectors", async() => {
        const result = await client.add([
            {
                label: "test",
                vector: addedVector
            }
        ]);

        log.debug("Add result", { result });
    });

    it("should query resulting one closest vector", async() => {
        const result = await client.query({
            k: 1,
            vector: addedVector
        });

        log.debug("Query result", { result });
        expect(result.result.length).toBe(1);
        expect(result.result[0].vector).toEqual(addedVector);
    });
});