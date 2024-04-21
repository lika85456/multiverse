import type { StatisticsEvent } from "../core/Events";

export default interface StatisticsQueue{
    push(event: StatisticsEvent): Promise<void>;
    getAllEvents(): Promise<StatisticsEvent[]>;
}