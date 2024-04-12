import { SQSHandler } from "@/features/statistics/statistics-processor/SQSHandler";
import { getAllQueuesWithCredentials } from "@/lib/mongodb/collections/user";

export async function POST() {
    const queuesWithCredentials = await getAllQueuesWithCredentials();

    const sqsHandler = new SQSHandler();
    const messages = await Promise.all(queuesWithCredentials.map(async(queue) => {
        const queueName = queue.sqs;
        const awsToken = {
            accessTokenId: queue.accessKeyId,
            secretAccessKey: queue.secretAccessKey
        };
        const messages = await sqsHandler.receiveMessages(queueName, awsToken);

        //TODO process messages
        return messages.length;
    }));

    return new Response(`total received: ${messages.reduce((acc, val) => acc + val, 0)}`);
}