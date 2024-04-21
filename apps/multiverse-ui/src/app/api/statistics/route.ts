import { SQSHandler } from "@/lib/statistics-processor/SQSHandler";
import { getAllQueuesWithCredentials } from "@/lib/mongodb/collections/user";
import log from "@multiverse/log";

export async function POST() {
    const startTime = performance.now(); // start timer for processing
    const queuesWithCredentials = await getAllQueuesWithCredentials();

    let numberOfQueuesBeingProcessed = 0;
    queuesWithCredentials.forEach((queue) => {
        // extract queue name and AWS token
        const queueName = queue.sqs;
        const awsToken = {
            accessKeyId: queue.accessKeyId,
            secretAccessKey: queue.secretAccessKey
        };

        // start message processing for queue
        const sqsHandler = new SQSHandler(startTime, queueName, awsToken);
        sqsHandler.processQueue().then(() => {
            log.info(`Messages in SQS queue ${queueName} processed`);
        }).catch((error) => {
            log.error(`Error processing messages in SQS queue ${queueName}: ${error}`);
        });

        // increment the number of queues to be processed
        numberOfQueuesBeingProcessed++;
    });

    return new Response(`Total queues being processed: ${numberOfQueuesBeingProcessed}`);
}