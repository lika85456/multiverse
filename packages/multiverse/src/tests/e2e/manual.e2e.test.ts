import Multiverse from "../..";
import type { Region } from "../../core/DatabaseConfiguration";
import { Vector } from "../../core/Vector";

describe.skip("Multiverse manual", () => {
    const region = "eu-central-1" as Region;

    const name = "manual";
    const config = { dimensions: 1536 };

    const multiverse = new Multiverse({
        region,
        awsToken: undefined as any,
        name: "manual"
    });

    // afterAll(async() => {
    //     await multiverse.removeDatabase(name);
    //     await multiverse.removeSharedInfrastructure();
    // });

    it("should create a database with no previous shared infrastructure", async() => {
        await multiverse.createDatabase({
            name,
            region,
            secretTokens: [{
                name: "hovnokleslo",
                secret: "hovnokleslo",
                validUntil: Number.MAX_SAFE_INTEGER/1000
            }],
            space: "l2",
            ...config
        });
    });

    it("should list one database", async() => {
        const databases = await multiverse.listDatabases();
        expect(databases.length).toBe(1);
    });

    it("should query empty in the database", async() => {
        const database = await multiverse.getDatabase(name);
        if (!database) throw new Error("Database not found");

        const result = await database.query({
            k: 10,
            sendVector: true,
            vector: Vector.random(config.dimensions)
        });
        expect(result.result.length).toBe(0);
    });

    it("should add 1000 vectors", async() => {
        const vectors = Array.from({ length: 1000 }, (_, i) => ({
            label: i + "",
            vector: Vector.random(config.dimensions)
        }));

        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        await db.addAll(vectors, 5 * 60 * 1000);
    });

    it("should respond with amount of stored vectors", async() => {
        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        const count = await db.;
        expect(count).toBe(1000);
    });

    it("should query among them correctly", async() => {
        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        const result = await db.query({
            k: 10,
            sendVector: true,
            vector: Vector.random(config.dimensions)
        });

        expect(result.result.length).toBe(10);
    });

    it("should remove the database", async() => {
        await multiverse.removeDatabase(name);
    });
});