import type { Event } from "@/features/statistics/statistics-processor/event";

export class StatisticsProcessor {

    private groupByDbName(events: Event[]): Map<string, Event[]> {
        return events.reduce((acc, event) => {
            if (!acc.has(event.dbName)) {
                acc.set(event.dbName, []);
            }
            acc.get(event.dbName)?.push(event);

            return acc;
        }, new Map<string, Event[]>());
    }

    private async processEventsForDatabase(databaseName: string, events: Event[]): Promise<boolean> {
        console.log(`Processing statistics for database ${databaseName}`);

        //TODO implement processing of events
        return true;
    }

    public processEvents(events: Event[]): void {
        console.log("Processing statistics");
        const eventsByDbName = this.groupByDbName(events);

        // start processing events for each database
        eventsByDbName.forEach((events, dbName) => {
            this.processEventsForDatabase(dbName, events).then((result) => {
                // done asynchronously to not block the processing of other databases
                console.log(`Statistics for database ${dbName} ${result ? "processed" : "failed"}`);
            });
        });
    }
}