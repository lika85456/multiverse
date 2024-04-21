import type { StatisticsEvent } from "../core/Events";
import SQSSStatisticsQueue from "./SQSStatisticsQueue";

describe("SQS Queue", () => {
    const q = new SQSSStatisticsQueue({
        region: "eu-central-1",
        queueName: Math.random().toString(36).substring(7)
    });

    beforeAll(async() => {
        await q.deploy();
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
                vectorsAfter: 20,
                dataSize: 100
            },
            {
                type: "remove",
                count: 10,
                dbName: "test",
                timestamp: Date.now(),
                vectorsAfter: 10,
                dataSize: 90
            }
        ];

        await q.push(events[0]);

        await q.push(events[1]);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = (await q.receiveMessages(Date.now() + 10000, 2)).sort((a, b) => a.timestamp - b.timestamp);

        expect(result.length).toBe(2);
        expect(result[0]).toEqual({
            ...events[0],
            MessageId: result[0].MessageId
        });
        expect(result[1]).toEqual({
            ...events[1],
            MessageId: result[1].MessageId
        });

        await q.removeMessages(result.map(r => r.MessageId));
    });

    it("should push 1000 items and get them all", async() => {
        const events: StatisticsEvent[] = Array.from({ length: 1000 }, (_, i) => ({
            type: "add",
            count: i,
            dbName: "test",
            timestamp: Date.now() - 1000,
            vectorsAfter: i,
            dataSize: i
        }));

        await Promise.all(events.map(event => q.push(event)));

        await new Promise(resolve => setTimeout(resolve, 1000));

        const start = Date.now();

        const result = await q.receiveMessages(Date.now() + 10000, 1000);
        console.log("Time", Date.now() - start);

        expect(result.length).toBe(1000);

        await q.removeMessages(result.map(r => r.MessageId));
    });
});