import type { Event } from "@/features/statistics/statistics-processor/event";
import type { DailyStatisticsAdd } from "@/lib/mongodb/collections/daily-statistics";
import { convertToISODate } from "@/lib/mongodb/collections/daily-statistics";
import { addDailyStatistics } from "@/lib/mongodb/collections/daily-statistics";
import { getDailyStatistics } from "@/lib/mongodb/collections/daily-statistics";
import {
    addGeneralDatabaseStatistics,
    getGeneralDatabaseStatistics
} from "@/lib/mongodb/collections/general-database-statistics";
import { UTCDate } from "@date-fns/utc";

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
            const date = convertToISODate(new UTCDate(event.timestamp));
            if (!acc.has(date)) {
                acc.set(date, []);
            }
            acc.get(date)?.push(event);

            return acc;
        }, new Map<string, Event[]>());
    }

    private calculateCost(databaseName: string, date: string): number {
        const dateISO = convertToISODate(date);
        console.log(`Calculating cost for database ${databaseName} and date ${dateISO}`);

        //TODO - calculate cost
        return 0;
    }

    private extractWriteData(event: Event) {
        if (event.type === "add") {
            return {
                timestamp: event.timestamp,
                totalVectors: event.totalVectors,
                dataSize: event.totalVectors * (4 * 1536 * 500), //TODO use returned data when provided
            };
        } else if (event.type === "remove") {
            return {
                timestamp: event.timestamp,
                totalVectors: event.totalVectors,
                dataSize: event.totalVectors * (4 * 1536 * 500), //TODO use returned data when provided
            };
        }

        throw new Error("Could not extract write data from non-write event");
    }

    private applyGeneralStatistics(databaseName: string, events: Event[]): void {
        // asynchronously update general statistics if the latest event is newer
        getGeneralDatabaseStatistics(databaseName).then(async(generalStatistics) => {
            // filter only write events (query events don't contain total vectors information)
            const writeEvents = events.filter((event) => event.type === "add" || event.type === "remove");
            if (writeEvents.length === 0) {
                console.log(`No write events for database ${databaseName} received`);

                return;
            }

            // at least one write event exists, find the latest one
            const latestWriteEvent = writeEvents.reduce((acc, event) => {
                if (acc.timestamp > event.timestamp) {
                    return acc;
                }

                return event;
            }, writeEvents[0]);

            // extract total vectors and data size from the latest write event
            const {
                totalVectors, dataSize, timestamp
            } = this.extractWriteData(latestWriteEvent);

            // general statistics don't exist for this database, create new statistics
            if (!generalStatistics) {
                await addGeneralDatabaseStatistics({
                    databaseName: databaseName,
                    updated: new UTCDate(timestamp),
                    dataSize: dataSize,
                    totalVectors: totalVectors,
                });
                console.log(`General statistics for database ${databaseName} created`);

                return;
            }
            // general statistics exist for this database, update if the latest write event is newer
            if (latestWriteEvent.timestamp > generalStatistics.updated.getTime()) {
                generalStatistics.updated = new UTCDate(timestamp);
                generalStatistics.dataSize = dataSize;
                generalStatistics.totalVectors = totalVectors;

                await addGeneralDatabaseStatistics(generalStatistics);
                console.log(`General statistics for database ${databaseName} updated`);

                return;
            }

            // don't update otherwise
            console.log(`General statistics for database ${databaseName} not updated`);
        });
    }

    private applyStatistics(events: Event[], innit: DailyStatisticsAdd): DailyStatisticsAdd {
        // calculate statistics from events and set resulting daily statistics
        const result = events.reduce((acc, event) => {
            if (event.type === "add") {
                acc.writeCount += 1;
            } else if (event.type === "remove") {
                acc.writeCount += 1;
            } else if (event.type === "query") {
                acc.readCount += 1;
                acc.totalResponseTime += event.duration;
            }

            return acc;
        }, innit);
        result.totalCost = result.totalCost += this.calculateCost(innit.databaseName, innit.date);

        return result;
    }

    private async processEventsForDatabase(databaseName: string, events: Event[]): Promise<boolean> {
        console.log(`Processing statistics for database ${databaseName}`);
        const eventsByDate = this.groupByDate(events);
        const allStatistics = await getDailyStatistics(Array.from(eventsByDate.keys()).map((e) => convertToISODate(e)), databaseName);

        // process events for each date
        eventsByDate.forEach((events, date) => {
            const filteredStatistics = allStatistics.filter(stat => stat.date === date);

            if (filteredStatistics.length === 0) {
                // if there are no statistics for the date, create new statistics
                const innit: DailyStatisticsAdd = {
                    date: convertToISODate(date),
                    databaseName: databaseName,
                    writeCount: 0,
                    readCount: 0,
                    totalResponseTime: 0,
                    totalCost: 0
                };
                // apply statistics to the innit object
                addDailyStatistics(this.applyStatistics(events, innit)).then(() => {
                    console.log(`Statistics for database ${databaseName} and date ${date} processed`);
                });

                //update general statistics
                this.applyGeneralStatistics(databaseName, events);

            } else if (filteredStatistics.length === 1) {
                // if there are statistics for the date, update existing statistics
                const statistics = filteredStatistics[0];
                const innit: DailyStatisticsAdd = {
                    date: convertToISODate(date),
                    databaseName: databaseName,
                    writeCount: statistics.writeCount,
                    readCount: statistics.readCount,
                    totalResponseTime: statistics.totalResponseTime,
                    totalCost: statistics.totalCost
                };
                // apply statistics to the innit object constructed from the existing statistics
                addDailyStatistics(this.applyStatistics(events, innit)).then(() => {
                    console.log(`Statistics for database ${databaseName} and date ${date} processed`);
                });

                //update general statistics
                this.applyGeneralStatistics(databaseName, events);

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