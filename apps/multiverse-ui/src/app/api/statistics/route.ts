import { SQSHandler } from "@/features/statistics/statistics-processor/SQSHandler";
import { getAllQueuesWithCredentials } from "@/lib/mongodb/collections/user";
import { StatisticsProcessor } from "@/features/statistics/statistics-processor/StatisticsProcessor";

export async function POST() {
    const queuesWithCredentials = await getAllQueuesWithCredentials();

    const sqsHandler = new SQSHandler();
    let total = 0;
    let received = 0;
    do {
        const messages = await Promise.all(queuesWithCredentials.map(async(queue) => {
            const queueName = queue.sqs;
            const awsToken = {
                accessKeyId: queue.accessKeyId,
                secretAccessKey: queue.secretAccessKey
            };
            // receive messages from the queue
            const messages = await sqsHandler.receiveMessages(queueName, awsToken);

            // process the events synchronously (not awaiting processing result)
            const statisticsProcessor = new StatisticsProcessor();
            statisticsProcessor.processEvents(messages);

            return messages.length;
        }));
        received = messages.reduce((acc, val) => acc + val, 0);
        total += received;
    } while (received > 0);

    return new Response(`Total received: ${total}`);
}