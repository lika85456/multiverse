import log from "@multiverse/log";
import Multiverse from "../..";
import type { Region } from "../../core/DatabaseConfiguration";

describe("Multiverse manual", () => {
    const region = "eu-west-1" as Region;

    const name = "manual";
    const config = { dimensions: 1536 };

    const multiverse = new Multiverse({
        region,
        awsToken: undefined as any,
        name: "manual-multiversos"
    });

    it("should delete manual database", async() => {
        await multiverse.removeDatabase(name);
    });

    it("should delete shared infra", async() => {
        await multiverse.destroySharedInfrastructure();
    });

    it("should create a database with no previous shared infrastructure", async() => {
        await multiverse.createDatabase({
            name,
            region,
            secretTokens: [{
                name: "hovnokleslo",
                secret: "hovnokleslo",
                validUntil: Number.MAX_SAFE_INTEGER / 1000
            }],
            space: "l2",
            ...config
        });
    });

    it("should delete a database with its infrastructure too", async() => {
        await multiverse.removeDatabase(name);
        await multiverse.destroySharedInfrastructure();
    });

    it("should list one database", async() => {
        const databases = await multiverse.listDatabases();
        expect(databases.length).toBe(1);
    });

    it("should query", async() => {
        const database = await multiverse.getDatabase(name);
        if (!database) throw new Error("Database not found");

        const start = Date.now();
        const result = await database.query({
            k: 100,
            sendVector: false,
            vector: Array.from({ length: config.dimensions }, () => 0)
        });

        const time = Date.now() - start;
        log.info(result.result.slice(0, 3));
        log.info(`Query took: ${time} ms`);
    });

    it("should add 1000 vectors", async() => {
        const vectors = Array.from({ length: 1000 }, (_, i) => ({
            label: i + "random",
            // vector: Array.from({ length: config.dimensions }, () => i)
            // add random vectors
            vector: Array.from({ length: config.dimensions }, () => Math.random())
        }));

        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        const start = Date.now();
        await db.addAll(vectors, 5 * 60 * 1000);
        log.info(`Adding 1000 vectors took: ${Date.now() - start}ms`);
    });

    it("should add 1 vector", async() => {
        const db = await multiverse.getDatabase(name);
        if (!db) {
            throw new Error("Database not found");
        }

        const start = Date.now();
        await db.add([{
            label: "1",
            vector: Array.from({ length: config.dimensions }, () => 1)
        }]);
        log.info(`Adding 1 vector took: ${Date.now() - start}ms`);
    });
});