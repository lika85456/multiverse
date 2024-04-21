import type { StatisticsEvent } from "../core/Events";

export default interface StatisticsQueue{
    push(event: StatisticsEvent): Promise<void>;
    receiveMessages(stopAtTimestamp: number, eventsLimit: number): Promise<(StatisticsEvent & { MessageId: string })[]>;
    removeMessages(messageIds: string[]): Promise<void>;

    deploy(options?: { queueName: string}): Promise<string>;
    destroy(): Promise<void>;
}