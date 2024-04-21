import type { Event } from "@/lib/statistics-processor/event";
import { performance } from "node:perf_hooks";
import log from "@multiverse/log";
import { StatisticsProcessor } from "@/lib/statistics-processor/StatisticsProcessor";

const COLLECTOR_LIMIT = 10_000; // 10_000 messages
const COLLECTOR_TIMEOUT = 1000 * 60 * 2; // 2 minutes

export class MessageCollector {
    private readonly startTime: number; //
    private readonly queueName: string;
    private readonly retrieversCount: number;
    private readonly deleteMessagesCallback: (receiptHandles: string[]) => void;

    private retrieversFinished = 0;
    private haveProcessingStarted = false;
    private timeoutId: NodeJS.Timeout | null = null;

    // map to store the messages uniquely by message id (SQS can return the same message multiple times)
    private collectedEvents: Map<string, {
        events: Event[],
        receiptHandler: string
    }> = new Map<string, {
        events: Event[],
        receiptHandler: string
    }>();

    constructor(queueName: string, retrieversCount: number, deleteMessagesCallback: (receiptHandles: string[]) => void, startTime: number) {
        this.startTime = startTime;
        log.info(`${(performance.now() - this.startTime) / 1000} | Collector created for queue ${queueName}`);
        this.queueName = queueName;
        this.retrieversCount = retrieversCount;
        this.deleteMessagesCallback = deleteMessagesCallback;
        this.startTimeout();
    }

    /**
     * Adds a message to the collector. If the collector limit is reached, the messages are processed.
     * @throws Error if messages are added after processing has started
     * @param messageId - the message id
     * @param message - the message to add
     */
    public addMessage(messageId: string, message: { events: Event[], receiptHandler: string }) {
        if (this.haveProcessingStarted) {
            throw new Error("Cannot add messages after processing has started");
        }
        if (this.collectedEvents.size >= COLLECTOR_LIMIT) {
            log.warn(`Collector limit reached for queue ${this.queueName}`);
            this.startProcessing(); // process the messages

            throw new Error("Collector limit reached"); // do not add the message (it will not be processed and deleted)
        }

        // add the message to the collector
        this.collectedEvents.set(messageId, message);
    }

    /**
     * Signals that a retriever has finished retrieving messages. If all retrievers have finished, the messages are processed.
     */
    public signalFinished() {
        this.retrieversFinished++;
        // log.debug(`${this.retrieversFinished} retrievers finished for queue ${this.queueName}`);
        if (this.retrieversFinished === this.retrieversCount) {
            this.startProcessing();
        }
    }

    /**
     * Starts the timeout for the collector. If the timeout is reached, the messages are processed and receiving
     * is stopped. The timeout is reset at the creation of the collector.
     * @private
     */
    private startTimeout() {
        this.timeoutId = setTimeout(() => {
            log.info(`Timeout reached for queue ${this.queueName}`);
            this.startProcessing();
            this.timeoutId = null;
        }, COLLECTOR_TIMEOUT);
    }

    /**
     * Timeout is stopped if it is running and therefore the message processing is will not start on timeout.
     * @private
     */
    private stopTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    /**
     * Processes the messages in the collector. The messages are deleted from the queue and the events are processed
     * by statistics processor.
     * @private
     */
    private startProcessing() {
        try {
            // guarantee only one instance of processMessages is running
            if (this.haveProcessingStarted) {
                return;
            }
            this.haveProcessingStarted = true;
            this.stopTimeout(); // stop the timeout

            // extract the events and receipt handles from the messages
            const events: Event[] = [];
            const receiptHandles: string[] = [];
            this.collectedEvents.forEach((message) => {
                events.push(...message.events);
                receiptHandles.push(message.receiptHandler);
            });

            // log duration of collecting messages
            log.info(`${(performance.now() - this.startTime) / 1000} | Messages collected from ${this.queueName}`);

            // delete the messages from the queue using callback and receipt handles
            this.deleteMessagesCallback(receiptHandles);

            // process events
            const statisticsProcessor = new StatisticsProcessor(this.startTime);
            statisticsProcessor.processEvents(events, this.queueName);
        } catch (error) {
            log.error("Error processing messages: ", error);
        }
    }
}