import DynamoChangesStorage from "../ChangesStorage/DynamoChangesStorage";
import type { DatabaseID, StoredDatabaseConfiguration } from "../core/DatabaseConfiguration";
import DynamoInfrastructureStorage from "../InfrastructureStorage/DynamoInfrastructureStorage";
import S3SnapshotStorage from "../SnapshotStorage/S3SnapshotStorage";
import LambdaOrchestrator from "./LambdaOrchestrator";

describe("<Orchestrator - integration>", () => {

    const databaseId: DatabaseID = {
        name: Date.now() + "",
        region: "eu-central-1"
    };

    const databaseConfiguration: StoredDatabaseConfiguration = {
        dimensions: 3,
        space: "l2",
        secretTokens: []
    };

    const changesStorage = new DynamoChangesStorage({
        databaseId,
        tableName: databaseId.name + "-changes"
    });

    const infrastructureStorage = new DynamoInfrastructureStorage({
        region: databaseId.region,
        tableName: databaseId.name + "-infrastructure"
    });

    const snapshotStorage = new S3SnapshotStorage({
        bucketName: databaseId.name + "-snapshot",
        databaseId
    });

    const orchestrator = new LambdaOrchestrator({
        databaseConfiguration,
        databaseId
    });

    beforeAll(async() => {
        await Promise.all([
            changesStorage.deploy(),
            infrastructureStorage.deploy(),
            snapshotStorage.deploy()
        ]);

        infrastructureStorage.set(databaseId.name, {
            configuration: databaseConfiguration,
            databaseId,
            partitions: [{
                lambda: [{
                    instances: [],
                    name: "test-worker-0",
                    region: databaseId.region,
                    type: "primary",
                    wakeUpInstances: 1,
                }],
                partitionIndex: 0
            }],
            scalingTargetConfiguration: {
                outOfRegionFallbacks: 0,
                secondaryFallbacks: 0,
                warmPrimaryInstances: 1,
                warmRegionalInstances: 0,
                warmSecondaryInstances: 0
            }
        });

        await orchestrator.deploy({
            changesTable: databaseId.name + "-changes",
            infrastructureTable: databaseId.name + "-infrastructure",
            snapshotBucket: databaseId.name + "-snapshot"
        });
    });

    afterAll(async() => {
        await Promise.all([
            changesStorage.destroy(),
            infrastructureStorage.destroy(),
            snapshotStorage.destroy(),
            orchestrator.destroy()
        ]);
    });

    it("should query empty", async() => {
        const result = await orchestrator.query({
            k: 10,
            vector: [1, 2, 3],
            sendVector: true
        });

        expect(result).toEqual({ result: [] });
    });
});