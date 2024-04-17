import type { Infrastructure } from ".";
import type { WorkerState } from "../Compute/Worker";
import DynamoInfrastructureStorage from "./DynamoInfrastructureStorage";

describe("<DynamoInfrastructureStorage>", () => {
    const storage = new DynamoInfrastructureStorage({
        region: "eu-central-1",
        tableName: "multiverse-test-infrastructure-storage-" + Date.now()
    });

    beforeAll(async() => {
        await storage.deploy();
    });

    afterAll(async() => {
        await storage.destroy();
    });

    it("should read empty", async() => {
        const infrastructure = await storage.get("test");
        expect(infrastructure).toBeUndefined();
    });

    it("should read empty list of infrastructures", async() => {
        const infrastructures = await storage.list();
        expect(infrastructures).toEqual([]);
    });

    it("should set and read infrastructure", async() => {
        const infrastructure: Infrastructure = {

            databaseId: {
                name: "test",
                region: "eu-central-1"
            },

            configuration: {
                dimensions: 3,
                space: "l2",
            },
            scalingTargetConfiguration: {
                warmPrimaryInstances: 10,
                warmSecondaryInstances: 5,
                warmRegionalInstances: 1,
                secondaryFallbacks: 1,
                outOfRegionFallbacks: 1
            },
            partitions: [{
                lambda: [{
                    instances: [],
                    name: "test-lambda-0",
                    region: "eu-central-1",
                    type: "primary",
                    wakeUpInstances: 69
                }],
                partitionIndex: 0
            }],
        };

        await storage.set("test", infrastructure);

        const readInfrastructure = await storage.get("test");
        expect(readInfrastructure).toEqual(infrastructure);
    });

    it("should list infrastructure", async() => {
        const infrastructures = await storage.list();
        expect(infrastructures.length).toBe(1);
    });

    it("should update worker state", async() => {
        const workerState: WorkerState = {
            instanceId: "0",
            ephemeralLimit: 1000,
            ephemeralUsed: 0,
            lastUpdate: 10,
            memoryLimit: 100,
            memoryUsed: 10,
            partitionIndex: 0
        };

        await storage.processState("test", "test-lambda-0", workerState);
    });

    it("should remove infrastructure", async() => {
        await storage.remove("test");
        const infrastructure = await storage.get("test");
        expect(infrastructure).toBeUndefined();
    });
});