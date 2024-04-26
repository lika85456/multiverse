import Multiverse from "../..";
import type { Region } from "../../core/DatabaseConfiguration";

describe("<Multiverse E2E>", () => {

    const region = "eu-central-1" as Region;

    const multiverse = new Multiverse({ region });

    it("should create a database with no previous shared infrastructure", async() => {
        await multiverse.createDatabase({
            dimensions: 3,
            name: "test",
            region,
            secretTokens: [{
                name: "hovnokleslo",
                secret: "hovnokleslo",
                validUntil: Number.MAX_SAFE_INTEGER
            }],
            space: "l2"
        });
    });

    it("should list one database", async() => {
        const databases = await multiverse.listDatabases();
        expect(databases.length).toBe(1);
    });

    it("should query empty in the database", async() => {
        const database = await multiverse.getDatabase("test");
        if (!database) throw new Error("Database not found");

        const result = await database.query({
            k: 10,
            sendVector: true,
            vector: [1, 2, 3]
        });
        expect(result.result.length).toBe(0);
    });

    it("should add 1000 vectors and query among them correctly and with multiple clients at a time", async() => {
        const vectors = Array.from({ length: 1000 }, (_, i) => ({
            label: i + "",
            vector: [i, i, i]
        }));

        const db = await multiverse.getDatabase("test");

        if (!db) {
            throw new Error("Database not found");
        }

        await db.add(vectors);

        const query = {
            k: 10,
            sendVector: true,
            vector: [1, 2, 3]
        };

        const results = await Promise.all(Array.from({ length: 100 }, () => db.query(query)));

        expect(results.length).toBe(100);
        console.log(results.slice(0, 10));
    });

    it("should remove database", async() => {
        await multiverse.removeDatabase("test");
    });

    it("should remove shared infrastructure", async() => {
        await multiverse.removeSharedInfrastructure();
    });
});