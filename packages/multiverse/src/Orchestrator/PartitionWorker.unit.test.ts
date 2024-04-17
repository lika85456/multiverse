import MemoryChangesStorage from "../ChangesStorage/MemoryChangesStorage";
import ComputeWorker from "../Compute/ComputeWorker";
import type { DatabaseConfiguration, Region } from "../core/DatabaseConfiguration";
import { Vector } from "../core/Vector";
import HNSWIndex from "../Index/HNSWIndex";
import MemoryInfrastructureStorage from "../InfrastructureStorage/MemoryInfrastructureStorage";
import LocalSnapshotStorage from "../SnapshotStorage/LocalSnapshotStorage";
import PartitionWorker from "./PartitionWorker";

describe("<PartitionWorker>", () => {

    const changesStorage = new MemoryChangesStorage();
    const snapshotStorage = new LocalSnapshotStorage("test");
    const config: DatabaseConfiguration = {
        dimensions: 3,
        space: "l2",
    };
    const index = new HNSWIndex(config);

    const infrastructureStorage = new MemoryInfrastructureStorage();

    const lambdaFactory = (_name: string, _region: Region) => new ComputeWorker({
        changesStorage,
        partitionIndex: 0,
        ephemeralLimit: 10_000,
        index,
        memoryLimit: 10_000,
        snapshotStorage
    });

    let worker: PartitionWorker;

    beforeAll(async() => {
        infrastructureStorage.set("test", {
            configuration: config,
            databaseId: {
                name: "test",
                region: "eu-central-1"
            },
            scalingTargetConfiguration: {
                warmPrimaryInstances: 1,
                warmRegionalInstances: 0,
                warmSecondaryInstances: 0,
                secondaryFallbacks: 0,
                outOfRegionFallbacks: 0
            },
            partitions: [{
                partitionIndex: 0,
                lambda: [{
                    instances: [],
                    name: "test-worker-0",
                    region: "eu-central-1",
                    type: "primary",
                    wakeUpInstances: 1
                }]
            }]
        });

        worker = new PartitionWorker({
            databaseName: "test",
            infrastructureStorage,
            partitionIndex: 0,
            lambdaFactory
        });
    });

    it("should response with empty query", async() => {
        const result = await worker.query({
            query: {
                k: 10,
                vector: Vector.random(3),
                sendVector: true
            }
        });

        expect(result.result.result.length).toBe(0);
        expect(result.state.lastUpdate).toBe(0);
    });
});