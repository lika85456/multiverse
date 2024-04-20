import MemoryChangesStorage from "../ChangesStorage/MemoryChangesStorage";
import ComputeWorker from "../Compute/ComputeWorker";
import type { Region, StoredDatabaseConfiguration } from "../core/DatabaseConfiguration";
import { Vector } from "../core/Vector";
import MockIndex from "../Index/MockIndex";
import MemoryInfrastructureStorage from "../InfrastructureStorage/MemoryInfrastructureStorage";
import LocalSnapshotStorage from "../SnapshotStorage/LocalSnapshotStorage";
import PartitionWorker from "./PartitionWorker";

describe("<PartitionWorker>", () => {

    let changesStorage: MemoryChangesStorage;
    let snapshotStorage: LocalSnapshotStorage;
    let config: StoredDatabaseConfiguration;

    let infrastructureStorage: MemoryInfrastructureStorage;

    const realLambdaFactory = (_name: string, _region: Region) => new ComputeWorker({
        changesStorage,
        partitionIndex: 0,
        ephemeralLimit: 10_000,
        index: new MockIndex({
            dimensionsCount: 3,
            spaceType: "l2"
        }),
        memoryLimit: 10_000,
        snapshotStorage
    });

    const busyLambdaFactory: any = (_name: string, _region: Region) => jest.fn(async() => {
        // wait 60 seconds then return
        await new Promise(resolve => setTimeout(resolve, 60_000));
    });

    // is a factory that returns busy lambda for the first tries, then returns a real lambda
    const nthSuccessLambdaFactory: any = (tries: number) => {
        let counter = 0;

        let realLambda: ComputeWorker | undefined;

        return (_name: string, _region: Region) => {
            if (counter < tries) {
                counter++;

                return busyLambdaFactory(_name, _region);
            }

            if (!realLambda) {
                realLambda = realLambdaFactory(_name, _region);
            }

            return realLambda;
        };
    };

    beforeEach(async() => {

        changesStorage = new MemoryChangesStorage();
        snapshotStorage = new LocalSnapshotStorage(Math.random() + "");
        config = {
            secretTokens: [],
            dimensions: 3,
            space: "l2",
        };

        infrastructureStorage = new MemoryInfrastructureStorage();

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
                lambda: [
                    {
                        instances: [],
                        name: "test-worker-0",
                        region: "eu-central-1",
                        type: "primary",
                        wakeUpInstances: 1
                    },
                    {
                        instances: [],
                        name: "test-worker-fallback",
                        region: "eu-central-1",
                        type: "fallback",
                        wakeUpInstances: 1
                    }
                ]
            }]
        });

    });

    it("should response with empty query", async() => {
        const worker = new PartitionWorker({
            databaseName: "test",
            infrastructureStorage,
            partitionIndex: 0,
            lambdaFactory: realLambdaFactory
        });

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

    it("should fail, because no lambda is available", async() => {
        const worker = new PartitionWorker({
            databaseName: "test",
            infrastructureStorage,
            partitionIndex: 0,
            lambdaFactory: busyLambdaFactory
        });

        const result = worker.query({
            query: {
                k: 10,
                vector: Vector.random(3),
                sendVector: true
            }
        });

        await expect(result).rejects.toThrow("All lambdas failed");
    });

    it("should use fallback because first worker is busy", async() => {
        const worker = new PartitionWorker({
            databaseName: "test",
            infrastructureStorage,
            partitionIndex: 0,
            lambdaFactory: nthSuccessLambdaFactory(1)
        });

        const result = await worker.query({
            query: {
                k: 10,
                vector: Vector.random(3),
                sendVector: true
            }
        });

        expect(result.result.result.length).toBe(0);
    });
});