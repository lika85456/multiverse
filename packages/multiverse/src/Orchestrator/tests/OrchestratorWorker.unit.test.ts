import MemoryChangesStorage from "../../ChangesStorage/MemoryChangesStorage";
import ComputeWorker from "../../Compute/ComputeWorker";
import type { Worker } from "../../Compute/Worker";
import type {
    DatabaseID, StoredDatabaseConfiguration, Region
} from "../../core/DatabaseConfiguration";
import type { Query } from "../../core/Query";
import LocalIndex from "../../Index/LocalIndex";
import MemoryInfrastructureStorage from "../../InfrastructureStorage/MemoryInfrastructureStorage";
import LocalSnapshotStorage from "../../SnapshotStorage/LocalSnapshotStorage";
import mockWorkerFactory from "../MockWorkerFactory";
import type Orchestrator from "../Orchestrator";
import OrchestratorWorker from "../OrchestratorWorker";

describe("<OrchestratorWorker>", () => {

    let databaseId: DatabaseID;

    const databaseConfiguration: StoredDatabaseConfiguration = {
        secretTokens: [],
        dimensions: 3,
        space: "l2",
    };

    let changesStorage: MemoryChangesStorage;
    let infrastructureStorage: MemoryInfrastructureStorage;
    let snapshotStorage: LocalSnapshotStorage;

    let realLambdaFactory: (name: string, region: Region) => Worker;

    let orchestrator: Orchestrator;

    beforeEach(async() => {

        databaseId = {
            name: Math.random() + "",
            region: "eu-central-1"
        };

        changesStorage = new MemoryChangesStorage();
        infrastructureStorage = new MemoryInfrastructureStorage();
        snapshotStorage = new LocalSnapshotStorage(databaseId.name);

        realLambdaFactory = mockWorkerFactory((_name, _region) => new ComputeWorker({
            partitionIndex: 0,
            ephemeralLimit: 10_000,
            index: new LocalIndex(databaseConfiguration),
            memoryLimit: 10_000,
            snapshotStorage
        }));

        await infrastructureStorage.set(databaseId.name, {
            configuration: databaseConfiguration,
            databaseId,
            partitions: [{
                lambda: [{
                    instances: [],
                    name: "test-worker-0",
                    region: "eu-central-1",
                    type: "primary",
                    wakeUpInstances: 1
                }],
                partitionIndex: 0
            }],
            scalingTargetConfiguration: {
                warmPrimaryInstances: 20,
                warmRegionalInstances: 0,
                warmSecondaryInstances: 0,
                secondaryFallbacks: 0,
                outOfRegionFallbacks: 0
            }
        });

        orchestrator = new OrchestratorWorker({
            changesStorage,
            databaseConfiguration,
            databaseId,
            infrastructureStorage,
            snapshotStorage,
            awsToken: undefined as any,

            maxChangesCount: 10,
            lambdaFactory: realLambdaFactory
        });

        await orchestrator.initialize();
    });

    it("should query empty", async() => {
        const query: Query = {
            vector: [1, 2, 3],
            k: 10,
            sendVector: true
        };

        const result = await orchestrator.query(query);

        expect(result).toEqual({ result: [] });
    });

    it("should remember changes even with empty workers", async() => {
        const query: Query = {
            vector: [1, 2, 3],
            k: 10,
            sendVector: true
        };

        await orchestrator.addVectors([{
            label: "test",
            vector: [1, 2, 3],
        }]);

        for (let i = 0;i < 10;i++) {
            const result = await orchestrator.query(query);

            expect(result).toEqual({
                result: [{
                    label: "test",
                    vector: [1, 2, 3],
                    distance: 0
                }]
            });
        }

        await orchestrator.removeVectors(["test"]);

        for (let i = 0;i < 10;i++) {
            const result = await orchestrator.query(query);

            expect(result).toEqual({ result: [] });
        }
    });

    it("should overwrite vector with the same label", async() => {
        await orchestrator.addVectors([{
            label: "test",
            vector: [1, 2, 3],
        }]);

        await orchestrator.addVectors([{
            label: "test",
            vector: [3, 2, 1],
        }]);

        const query: Query = {
            vector: [1, 2, 3],
            k: 10,
            sendVector: true
        };

        const result = await orchestrator.query(query);

        expect(result).toEqual({
            result: [{
                label: "test",
                vector: [3, 2, 1],
                distance: 8
            }]
        });
    });

    it("should flush after max changes count", async() => {
        // add 15 vectors and assert that there are 5 vectors in the changes storage and all the workers have loaded their snapshots
        await orchestrator.addVectors(Array.from({ length: 15 }, (_, i) => ({
            label: `test-${i}`,
            vector: [i, i, i],
        })));

        expect(await changesStorage.count()).toBe(0);

        for (let i = 0;i < 10;i++) {
            const result = await orchestrator.query({
                vector: [15, 15, 15],
                k: 15,
                sendVector: true
            });

            expect(result.result.length).toBe(15);
        }
    });

});