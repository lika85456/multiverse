import ComputeWorker from "../../Compute/ComputeWorker";
import type { StoredDatabaseConfiguration, Region } from "../../core/DatabaseConfiguration";
import { Vector } from "../../core/Vector";
import LocalIndex from "../../Index/LocalIndex";
import MemoryInfrastructureStorage from "../../InfrastructureStorage/MemoryInfrastructureStorage";
import LocalSnapshotStorage from "../../SnapshotStorage/LocalSnapshotStorage";
import mockWorkerFactory from "../MockWorkerFactory";
import PartitionWorker from "../PartitionWorker";

describe("<PartitionWorker>", () => {

    let snapshotStorage: LocalSnapshotStorage;
    let config: StoredDatabaseConfiguration;

    let infrastructureStorage: MemoryInfrastructureStorage;

    const realLambdaFactory = (_name: string, _region: Region) => new ComputeWorker({
        partitionIndex: 0,
        ephemeralLimit: 10_000,
        index: new LocalIndex(config),
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

    const scalingTargetConfiguration = {
        warmPrimaryInstances: 20,
        warmSecondaryInstances: 0,
        warmRegionalInstances: 5,
        secondaryFallbacks: 0,
        outOfRegionFallbacks: 0
    };

    beforeEach(async() => {

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
            scalingTargetConfiguration,
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
            lambdaFactory: realLambdaFactory,
            awsToken: undefined as any
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
            lambdaFactory: busyLambdaFactory,
            awsToken: undefined as any
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
            lambdaFactory: nthSuccessLambdaFactory(1),
            awsToken: undefined as any
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

    it("should call scalingTarget instances", async() => {
        let instances = 0;

        const workerFactory = mockWorkerFactory((_name: string, _region: Region) => {
            instances++;

            return new ComputeWorker({
                partitionIndex: 0,
                ephemeralLimit: 10_000,
                index: new LocalIndex(config),
                memoryLimit: 10_000,
                snapshotStorage
            });
        });

        const worker = new PartitionWorker({
            databaseName: "test",
            infrastructureStorage,
            partitionIndex: 0,
            lambdaFactory: workerFactory,
            awsToken: undefined as any
        });

        await worker.requestAll("loadLatestSnapshot", [], "all", scalingTargetConfiguration);

        expect(instances).toBe(25);
    });
});