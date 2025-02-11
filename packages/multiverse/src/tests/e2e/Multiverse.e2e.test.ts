import log from "@multiverse/log";
import Multiverse from "../..";
import type { Region } from "../../core/DatabaseConfiguration";
import { Vector } from "../../core/Vector";
import LocalIndex from "../../Index/LocalIndex";
import HNSWIndex from "../../Index/HNSWIndex";

describe.each([
    ["low-dimensions", { dimensions: 100 }],
    ["high-dimensions", { dimensions: 1536 }],
])("Multiverse E2E %s", (name, config) => {
    const region = "eu-west-1" as Region;

    const multiverse = new Multiverse({
        region,
        awsToken: undefined as any,
        name: "test"
    });

    afterAll(async() => {
        try {
            await multiverse.removeDatabase(name);
        } catch (e) {
            log.error(e);
        }

        try {
            await multiverse.destroySharedInfrastructure().catch(log.error);
        } catch (e) {
            log.error(e);
        }
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

    // tab:pinecone-serverless-resource-usage

    it("should add 10 vectors and query amongst them correctly", async() => {
        const vectors = Array.from({ length: 10 }, (_, i) => ({
            label: i + "",
            vector: Vector.random(config.dimensions)
        }));

        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        await db.addAll(vectors, 5 * 60 * 1000);

        const localIndex = new LocalIndex({
            dimensions: config.dimensions,
            space: "l2"
        });
        await localIndex.add(vectors);

        const queryVector = Vector.random(config.dimensions);

        const result = await db.query({
            k: 10,
            vector: queryVector,
            sendVector: false
        });

        const expectedResult = await localIndex.knn({
            vector: queryVector,
            k: 10,
            sendVector: false
        });

        expect(result.result).toEqual(expectedResult);
    });

    it("should remove the vectors and query empty", async() => {
        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        await db.remove(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

        const result = await db.query({
            k: 10,
            sendVector: true,
            vector: Vector.random(config.dimensions)
        });

        expect(result.result.length).toBe(0);
    });

    it("should add 1000 vectors and query amongst them correctly", async() => {
        const vectors = Array.from({ length: 1000 }, (_, i) => ({
            label: i + "",
            // vector: Vector.random(config.dimensions)
            vector: Array.from({ length: config.dimensions }, () => i)
        }));

        const db = await multiverse.getDatabase(name);

        if (!db) {
            throw new Error("Database not found");
        }

        await db.addAll(vectors, 5 * 60 * 1000);

        const localIndex = new HNSWIndex({
            dimensions: config.dimensions,
            space: "l2"
        });
        await localIndex.add(vectors);

        await Promise.allSettled([0, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(async(vectorDimensionValue) => {
            const queryVector = Array.from({ length: config.dimensions }, () => vectorDimensionValue);

            const result = await db.query({
                k: 20,
                vector: queryVector,
                sendVector: false
            });

            const expectedResult = await localIndex.knn({
                vector: queryVector,
                k: 20,
            });

            // remove metadata from expected result
            // @ts-ignore
            expectedResult.forEach((r) => delete r.metadata);

            //expect labels to be the same
            expect(result.result.map(r => r.label)).toEqual(expectedResult.map(r => r.label));

            // expect distances to be kinda close (not exactly the same)
            for (let i = 0;i < 20;i++) {
                expect(Math.abs(result.result[i].distance - expectedResult[i].distance)).toBeLessThan(1e-3);
            }
        }));
    });
});