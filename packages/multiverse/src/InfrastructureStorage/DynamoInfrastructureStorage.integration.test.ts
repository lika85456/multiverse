import type { Infrastructure } from ".";
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
            configuration: {
                name: "test",
                region: "eu-central-1",
                dimensions: 3,
                space: "l2",
                regionalInstances: 0,
                secondaryInstances: 1,
                warmPrimaryInstances: 1,
            },
            partitions: [{
                lambda: [{
                    instances: [],
                    name: "test",
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
        expect(infrastructures[0].configuration.name).toBe("test");
    });

    it("should remove infrastructure", async() => {
        await storage.remove("test");
        const infrastructure = await storage.get("test");
        expect(infrastructure).toBeUndefined();
    });
});