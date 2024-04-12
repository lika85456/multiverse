import type { Event, QueryEvent } from "@/features/statistics/statistics-processor/event";
import type { DailyStatisticsAdd } from "@/lib/mongodb/collections/daily-statistics";
import { addDailyStatistics } from "@/lib/mongodb/collections/daily-statistics";
import { getDailyStatistics } from "@/lib/mongodb/collections/daily-statistics";

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

    private groupByDate(events: Event[]): Map<string, Event[]> {
        return events.reduce((acc, event) => {
            const date = new Date(event.timestamp).toDateString();
            if (!acc.has(date)) {
                acc.set(date, []);
            }
            acc.get(date)?.push(event);

            return acc;
        }, new Map<string, Event[]>());
    }

    private applyStatistics(events: Event[], innit: DailyStatisticsAdd): DailyStatisticsAdd {
        const result = events.reduce((acc, event) => {
            if (event.type === "add") {
                acc.writeCount += 1;
            } else if (event.type === "remove") {
                acc.writeCount += 1;
            } else if (event.type === "query") {
                acc.readCount += 1;
                const queryEvent = event as QueryEvent;
                acc.totalResponseTime += queryEvent.duration;
            }

            return acc;
        }, innit);
        result.totalCost = result.totalCost += this.calculateCost(innit.databaseName, innit.date);

        return result;
    }

    private calculateCost(databaseName: string, date: string): number {
        console.log(`Calculating cost for database ${databaseName} and date ${date}`);

        //TODO - calculate cost
        return 0;
    }

    private async processEventsForDatabase(databaseName: string, events: Event[]): Promise<boolean> {
        console.log(`Processing statistics for database ${databaseName}`);
        const eventsByDate = this.groupByDate(events);
        const allStatistics = await getDailyStatistics(Array.from(eventsByDate.keys()), databaseName);

        // process events for each date
        eventsByDate.forEach((events, date) => {
            const filteredStatistics = allStatistics.filter(stat => stat.date === date);

            if (filteredStatistics.length === 0) {
                // if there are no statistics for the date, create new statistics
                const dailyStatistics = this.applyStatistics(events, {
                    date: date,
                    databaseName: databaseName,
                    writeCount: 0,
                    readCount: 0,
                    totalResponseTime: 0,
                    totalCost: 0
                } as DailyStatisticsAdd);
                addDailyStatistics(dailyStatistics).then(() => {
                    console.log(`Statistics for database ${databaseName} and date ${date} processed`);
                });
            } else if (filteredStatistics.length === 1) {
                // if there are statistics for the date, update existing statistics
                const statistics = filteredStatistics[0];
                const dailyStatistics = this.applyStatistics(events, {
                    date: date,
                    databaseName: databaseName,
                    writeCount: statistics.writeCount,
                    readCount: statistics.readCount,
                    totalResponseTime: statistics.totalResponseTime,
                    totalCost: statistics.totalCost
                } as DailyStatisticsAdd);

                addDailyStatistics(dailyStatistics).then(() => {
                    console.log(`Statistics for database ${databaseName} and date ${date} processed`);
                });
            } else {
                // if there are multiple statistics for the date, log an error
                // don't throw an error to not block the processing of other databases
                console.log(`Multiple statistics for the same date ${date} and database ${databaseName}`);
            }
        });
        console.log(`Statistics for database ${databaseName} processed`);

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