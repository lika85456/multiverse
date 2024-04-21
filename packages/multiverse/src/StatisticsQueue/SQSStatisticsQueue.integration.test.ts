import type { StatisticsEvent } from "../core/Events";
import SQSSStatisticsQueue from "./SQSStatisticsQueue";

describe("SQS Queue", () => {
    const q = new SQSSStatisticsQueue({});

    beforeAll(async() => {
        await q.deploy({ queueName: Math.random().toString(36).substring(7) });
    });

    afterAll(async() => {
        await q.destroy();
    });

    it("should push and receive events", async() => {
        const events: StatisticsEvent[] = [
            {
                type: "add",
                count: 20,
                dbName: "test",
                timestamp: Date.now() - 1000,
                vectorsAfter: 20
            },
            {
                type: "remove",
                count: 10,
                dbName: "test",
                timestamp: Date.now(),
                vectorsAfter: 10
            }
        ];

        await q.push(events[0]);

        await q.push(events[1]);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = (await q.getAllEvents()).sort((a, b) => a.timestamp - b.timestamp);

        expect(result.length).toBe(2);
        expect(result[0]).toEqual(events[0]);
        expect(result[1]).toEqual(events[1]);
    });

    it.skip("should push 10000 items and get them all", async() => {
        const events: StatisticsEvent[] = Array.from({ length: 10000 }, (_, i) => ({
            type: "add",
            count: i,
            dbName: "test",
            timestamp: Date.now() - 1000,
            vectorsAfter: i
        }));

        await Promise.all(events.map(event => q.push(event)));

        await new Promise(resolve => setTimeout(resolve, 1000));

        const start = Date.now();

        const result = await q.getAllEventsParallel(100);
        console.log("Time", Date.now() - start);

        expect(result.length).toBe(10000);
    });
});