import { StatisticsProcessor } from "@/features/statistics/statistics-processor/StatisticsProcessor";
import { getAllQueuesWithCredentials } from "@/lib/mongodb/collections/user";

export async function POST() {
    const queuesWithCredentials = await getAllQueuesWithCredentials();

    const queueName = queuesWithCredentials[0].sqs;
    const awsToken = {
        accessTokenId: queuesWithCredentials[0].accessKeyId,
        secretAccessKey: queuesWithCredentials[0].secretAccessKey
    };
    if (!queueName || !awsToken) {
        return new Response("Queue not found");
    }
    const statisticsProcessor = new StatisticsProcessor();
    const messages = await statisticsProcessor.processQueueMessages(queueName, awsToken);

    return new Response(JSON.stringify(messages, null, 2));
}