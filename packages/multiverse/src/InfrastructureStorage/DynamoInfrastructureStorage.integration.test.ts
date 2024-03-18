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

    it("should set and read infrastructure", async() => {
        const infrastructure: Infrastructure = {
            configuration: {
                name: "test",
                region: "eu-central-1",
                dimensions: 3,
                space: "l2"
            },
            partitions: [{
                lambda: [{
                    instances: [],
                    name: "test",
                    region: "eu-central-1",
                    type: "primary",
                    wakeUpInstances: 69
                }],
                partition: 0
            }],
            secretTokens: [{
                name: "test",
                secret: "test",
                validUntil: Date.now() + 1000
            }]
        };

        await storage.set("test", infrastructure);

        const readInfrastructure = await storage.get("test");
        expect(readInfrastructure).toEqual(infrastructure);
    });

    it("should remove infrastructure", async() => {
        await storage.remove("test");
        const infrastructure = await storage.get("test");
        expect(infrastructure).toBeUndefined();
    });
});