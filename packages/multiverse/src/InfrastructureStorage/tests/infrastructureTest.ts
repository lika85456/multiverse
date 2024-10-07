import type { Infrastructure } from "..";
import type InfrastructureStorage from "..";
import type { WorkerState } from "../../Compute/Worker";

export default function(storage: InfrastructureStorage) {

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
                secretTokens: [],
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

    it("should not process state from very old worker", async() => {
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

        const infrastructure = await storage.get("test");
        expect(infrastructure?.partitions[0].lambda[0].instances.length).toBe(0);
    });

    it("should process not existing worker state", async() => {
        const workerState: WorkerState = {
            instanceId: "0",
            ephemeralLimit: 1000,
            ephemeralUsed: 0,
            lastUpdate: Date.now() - 1000,
            memoryLimit: 100,
            memoryUsed: 10,
            partitionIndex: 0
        };

        await storage.processState("test", "test-lambda-0", workerState);

        const infrastructure = await storage.get("test");
        expect(infrastructure?.partitions[0].lambda[0].instances.length).toBe(1);
        expect(infrastructure?.partitions[0].lambda[0].instances[0].lastUpdated).toBe(workerState.lastUpdate);
    });

    it("should update existing worker state", async() => {
        const workerState: WorkerState = {
            instanceId: "0",
            ephemeralLimit: 1000,
            ephemeralUsed: 0,
            lastUpdate: Date.now(),
            memoryLimit: 100,
            memoryUsed: 10,
            partitionIndex: 0
        };

        await storage.processState("test", "test-lambda-0", workerState);

        const infrastructure = await storage.get("test");
        expect(infrastructure?.partitions[0].lambda[0].instances.length).toBe(1);
        expect(infrastructure?.partitions[0].lambda[0].instances[0].lastUpdated).toBe(workerState.lastUpdate);
    });

    it("should add token", async() => {
        // assert there are no tokens
        const infrastructure = await storage.get("test");

        if (!infrastructure) {
            throw new Error("Infrastructure not found");
        }

        expect(infrastructure?.configuration.secretTokens.length).toBe(0);

        // add token
        await storage.setProperty("test", "configuration", {
            ...infrastructure.configuration,
            secretTokens: [{
                name: "test-token",
                secret: "test-value",
                validUntil: Date.now() + 1000
            }]
        });

        // assert token was added
        const updatedInfrastructure = await storage.get("test");
        expect(updatedInfrastructure?.configuration.secretTokens.length).toBe(1);
    });

    it("should remove infrastructure", async() => {
        await storage.remove("test");
        const infrastructure = await storage.get("test");
        expect(infrastructure).toBeUndefined();
    });

    it.skip("should not overwrite the rest of the data when updating state of an instance", async() => {

    });
}