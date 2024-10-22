import BuildBucket from "../../BuildBucket/BuildBucket";
import DynamoChangesStorage from "../../ChangesStorage/DynamoChangesStorage";
import type { DatabaseID, StoredDatabaseConfiguration } from "../../core/DatabaseConfiguration";
import type { NewVector } from "../../core/Vector";
import { Vector } from "../../core/Vector";
import LocalIndex from "../../Index/LocalIndex";
import DynamoInfrastructureStorage from "../../InfrastructureStorage/DynamoInfrastructureStorage";
import S3SnapshotStorage from "../../SnapshotStorage/S3SnapshotStorage";
import LambdaOrchestrator from "../LambdaOrchestrator";

describe("<LambdaOrchestrator>", () => {

    const databaseId: DatabaseID = {
        name: Math.random().toString(36).substring(7),
        region: "eu-central-1"
    };

    const databaseConfiguration: StoredDatabaseConfiguration = {
        dimensions: 1536,
        space: "l2",
        secretTokens: [{
            name: "hovnokleslo",
            secret: "hovnokleslo",
            validUntil: Date.now() + 1000 * 60 * 60
        }]
    };

    const changesStorage = new DynamoChangesStorage({
        databaseId,
        tableName: "multiverse-changes-" + databaseId.name,
        awsToken: undefined as any
    });

    const infrastructureStorage = new DynamoInfrastructureStorage({
        region: databaseId.region,
        tableName: "multiverse-infrastructure-" + databaseId.name,
        awsToken: undefined as any
    });

    const snapshotStorage = new S3SnapshotStorage({
        bucketName: "multiverse-snapshot-" + databaseId.name,
        databaseId,
        awsToken: undefined as any
    });

    const orchestrator = new LambdaOrchestrator({
        databaseId,
        secretToken: "hovnokleslo",
        awsToken: undefined as any
    });

    const buildBucket = new BuildBucket("multiverse-build-" + databaseId.name, {
        region: "eu-central-1",
        awsToken: undefined as any
    });

    beforeAll(async() => {
        await Promise.allSettled([
            changesStorage.deploy(),
            infrastructureStorage.deploy(),
            snapshotStorage.deploy(),
            buildBucket.deploy()
        ]);

        // build orchestrator
        await LambdaOrchestrator.build(buildBucket);

        await orchestrator.deploy({
            changesTable: changesStorage.getResourceName(),
            infrastructureTable: infrastructureStorage.getResourceName(),
            snapshotBucket: snapshotStorage.getResourceName(),
            buildBucket: buildBucket.getResourceName(),
            databaseConfiguration,
            scalingTargetConfiguration: {
                warmPrimaryInstances: 5,
                warmRegionalInstances: 0,
                warmSecondaryInstances: 0,
                outOfRegionFallbacks: 0,
                secondaryFallbacks: 0,
            }
        });
    });

    afterAll(async() => {
        await Promise.allSettled([
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

    it("should add 10 vectors and return correct result", async() => {
        const vectors: NewVector[] = Array.from({ length: 10 }, (_, i) => ({
            label: i + "",
            vector: Vector.random(3)
        }));

        await orchestrator.addVectors(vectors);

        const queryVector = Vector.random(3);

        // wait 1s
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = await orchestrator.query({
            k: 10,
            vector: queryVector,
            sendVector: true
        });

        const mockIndex = new LocalIndex({
            dimensions: 3,
            space: "l2"
        });

        mockIndex.add(vectors);
        const mockResult = await mockIndex.knn({
            vector: queryVector,
            k: 10,
            sendVector: true
        });

        // there might  be some precision errors in vectors and distances - so we need to compare them separately
        for (let i = 0; i < result.result.length; i++) {
            expect(result.result[i].label).toEqual(mockResult[i].label);
            expect(result.result[i].distance).toBeCloseTo(mockResult[i].distance, 5);
            // expect(result.result[i].vector).toBeCloseTo(mockResult[i].vector, 5);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            for (let j = 0; j < result.result[i].vector!.length; j++) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                expect(result.result[i].vector![j]).toBeCloseTo(mockResult[i].vector![j], 5);
            }
        }
    });

    // TODO infrastructure not initialized
});