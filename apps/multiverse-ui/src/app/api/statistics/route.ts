import { getAllQueuesWithCredentials } from "@/lib/mongodb/collections/user";
import { StatisticsProcessor } from "@/lib/statistics-processor/StatisticsProcessor";
import SQSSStatisticsQueue from "@multiverse/multiverse/src/StatisticsQueue/SQSStatisticsQueue";
import log from "@multiverse/log";

export async function POST() {
    log.info("STATISTICS_PROCESSOR: [START] Processing statistics");
    const startTime = performance.now(); // start timer for processing
    const queuesWithCredentials = await getAllQueuesWithCredentials();

    const processedEvents = await Promise.all(queuesWithCredentials.map(async(queue) => {
        // extract queue name and AWS token
        const queueName = queue.sqs;
        const awsToken = {
            accessKeyId: queue.accessKeyId,
            secretAccessKey: queue.secretAccessKey
        };

        try {
            const sqs = new SQSSStatisticsQueue({
                region: "eu-central-1",
                queueName,
                awsToken
            });

            // receive messages from the queue
            log.debug(`STATISTICS_PROCESSOR: Receiving from ${queueName}`);
            const statisticsEvents = await sqs.receiveMessages(Date.now() + 10000, 1000);

            // process the events
            log.debug(`STATISTICS_PROCESSOR: Processing events from ${queueName}`);
            const processedEvents = await new StatisticsProcessor().processEvents(statisticsEvents);

            // remove the processed messages from the queue
            log.debug(`STATISTICS_PROCESSOR: Removing messages from ${queueName}`);
            await sqs.removeMessages(statisticsEvents.map(message => {
                return {
                    messageId: message.MessageId,
                    receiptHandle: message.ReceiptHandle
                };
            }));
            log.debug(`STATISTICS_PROCESSOR: Processed ${statisticsEvents.length} events for ${queueName}`);

            return processedEvents;
        } catch (error) {
            log.error("Error processing messages: ", error);

            return 0;
        }
    }));

    const processedEventsCount = processedEvents.reduce((acc, events) => acc + events, 0);
    const endTime = performance.now() - startTime; // end timer for processing
    log.info(`STATISTICS_PROCESSOR: [DONE] Processed ${processedEventsCount} events in ${endTime / 1000}s`);

    return new Response(`Processed ${processedEventsCount} events in ${endTime / 1000}s`);
}