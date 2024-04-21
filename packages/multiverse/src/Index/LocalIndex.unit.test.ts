import type { NewVector } from "../core/Vector";
import HNSWIndex from "./HNSWIndex";
import LocalIndex from "./LocalIndex";

describe("<LocalIndex>", () => {

    const query = {
        vector: [1, 2, 3],
        k: 10,
        sendVector: true
    };

    const vectors: NewVector[] = [
        {
            label: "1",
            vector: [1, 2, 3],
        },
        {
            label: "2",
            vector: [3, 2, 1],
        },
        {
            label: "3",
            vector: [2, 2, 2],
        }
    ];

    it("should support ip", async() => {
        const mockIndex = new LocalIndex({
            dimensions: 3,
            space: "ip"
        });
        const realIndex = new HNSWIndex({
            dimensions: 3,
            space: "ip",
        });

        await realIndex.add(vectors);
        await mockIndex.add(vectors);

        const mockResult = await mockIndex.knn(query);
        const realResult = await realIndex.knn(query);

        expect(mockResult).toEqual(realResult);
    });

    it("should support i2", async() => {
        const mockIndex = new LocalIndex({
            dimensions: 3,
            space: "l2"
        });
        const realIndex = new HNSWIndex({
            dimensions: 3,
            space: "l2",
        });

        await realIndex.add(vectors);
        await mockIndex.add(vectors);

        const mockResult = await mockIndex.knn(query);
        const realResult = await realIndex.knn(query);

        expect(mockResult).toEqual(realResult);
    });

    it("should support cosine", async() => {
        const mockIndex = new LocalIndex({
            dimensions: 3,
            space: "cosine"
        });
        const realIndex = new HNSWIndex({
            dimensions: 3,
            space: "cosine",
        });

        await realIndex.add(vectors);
        await mockIndex.add(vectors);

        const mockResult = await mockIndex.knn(query);
        const realResult = await realIndex.knn(query);

        const MAX_DIFF = 0.0001;
        mockResult.forEach((mock, index) => {
            const real = realResult[index];
            expect(mock.label).toEqual(real.label);
            expect(mock.metadata).toEqual(real.metadata);
            // expect(mock.vector).toEqual(real.vector);
            expect(Math.abs(mock.distance - real.distance)).toBeLessThan(MAX_DIFF);
        });
    });

    it("should support 1536 dimensions and query 1000 vectors", async() => {
        const dimensions = 1536;
        const vectors = Array.from({ length: 1000 }, (_, i) => ({
            label: i + "",
            vector: Array.from({ length: dimensions }, () => i)
        }));

        const mockIndex = new LocalIndex({
            dimensions,
            space: "l2"
        });
        const realIndex = new HNSWIndex({
            dimensions,
            space: "l2",
        });

        await mockIndex.add(vectors);
        await realIndex.add(vectors);

        const queryVector = Array.from({ length: dimensions }, () => 0);
        const query = {
            vector: queryVector,
            k: 10,
            sendVector: true
        };

        const mockResult = await mockIndex.knn(query);
        const realResult = await realIndex.knn(query);

        const MAX_DIFF = 0.0001;
        mockResult.forEach((mock, index) => {
            const real = realResult[index];
            expect(mock.label).toEqual(real.label);
            expect(mock.metadata).toEqual(real.metadata);
            // expect(mock.vector).toEqual(real.vector);
            expect(Math.abs(mock.distance - real.distance)).toBeLessThan(MAX_DIFF);
        });
    });
});