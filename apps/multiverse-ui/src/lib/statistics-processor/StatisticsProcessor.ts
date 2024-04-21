import type { DailyStatisticsAdd } from "@/lib/mongodb/collections/daily-statistics";
import { addDailyStatistics } from "@/lib/mongodb/collections/daily-statistics";
import { convertToISODate } from "@/lib/mongodb/collections/daily-statistics";
import { getDailyStatisticsForDates } from "@/lib/mongodb/collections/daily-statistics";
import {
    addGeneralDatabaseStatistics,
    getGeneralDatabaseStatistics
} from "@/lib/mongodb/collections/general-database-statistics";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";
import type { StatisticsEvent } from "@multiverse/multiverse/src/core/Events";
import { format } from "date-fns";

export class StatisticsProcessor {

    /**
     * Group events by database name. The resulting map has database names as keys and arrays of events as values.
     * @param events - the events to group
     * @private
     */
    private groupByDbName(events: StatisticsEvent[]): Map<string, StatisticsEvent[]> {
        return events.reduce((acc, event) => {
            if (!acc.has(event.dbName)) {
                acc.set(event.dbName, []);
            }
            acc.get(event.dbName)?.push(event);

            return acc;
        }, new Map<string, StatisticsEvent[]>());
    }

    /**
     * Group events by date. The resulting map has dates as keys and arrays of events as values.
     * @param events - the events to group
     * @private
     */
    private groupByDate(events: StatisticsEvent[]): Map<string, StatisticsEvent[]> {
        return events.reduce((acc, event) => {
            const date = convertToISODate(new UTCDate(event.timestamp));
            if (!acc.has(date)) {
                acc.set(date, []);
            }
            acc.get(date)?.push(event);

            return acc;
        }, new Map<string, StatisticsEvent[]>());
    }

    /**
     * Extract write data from the event. The write data contains the timestamp, total vectors, and data size.
     * @param event - the event to extract the write data from
     * @private
     */
    private extractWriteData(event: StatisticsEvent) {
        if (event.type === "add") {
            return {
                timestamp: event.timestamp,
                totalVectors: event.vectorsAfter,
                dataSize: event.dataSize,
            };
        } else if (event.type === "remove") {
            return {
                timestamp: event.timestamp,
                totalVectors: event.vectorsAfter,
                dataSize: event.dataSize,
            };
        }

        throw new Error("Could not extract write data from non-write event");
    }

    /**
     * Apply general statistics to the database. The general statistics contain the total vectors and data size.
     * The general statistics are updated if the latest write event is newer than the existing statistics.
     * If the general statistics don't exist, they are created. If the latest write event is older than the existing
     * statistics, the general statistics are not updated.
     * @param databaseName - the name of the database
     * @param events - the events to apply the general statistics to
     * @private
     */
    private async applyGeneralStatistics(databaseName: string, events: StatisticsEvent[]): Promise<void> {
        // asynchronously update general statistics if the latest event is newer
        const generalStatistics = await getGeneralDatabaseStatistics(databaseName);

        // filter only write events (query events don't contain total vectors information)
        const writeEvents = events.filter((event) => event.type === "add" || event.type === "remove");
        if (writeEvents.length === 0) {
            log.info(`No write events for database ${databaseName} received`);

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
            // log.debug(`General statistics for database ${databaseName} created`);

            return;
        }
        // general statistics exist for this database, update if the latest write event is newer
        if (latestWriteEvent.timestamp > generalStatistics.updated.getTime()) {
            generalStatistics.updated = new UTCDate(timestamp);
            generalStatistics.dataSize = dataSize;
            generalStatistics.totalVectors = totalVectors;

            await addGeneralDatabaseStatistics(generalStatistics);
            // log.debug(`General statistics for database ${databaseName} updated`);

            return;
        }

        // don't update otherwise
        // log.debug(`General statistics for database ${databaseName} not updated`);
    }

    /**
     * Apply statistics to the daily statistics. The daily statistics contain the write count, read count, total response
     * @param events - the events to apply the statistics to
     * @param innit - the initial daily statistics
     * @private
     */
    private applyStatistics(events: StatisticsEvent[], innit: DailyStatisticsAdd): DailyStatisticsAdd {
        // calculate statistics from events and set resulting daily statistics
        const result = events.reduce((acc, event) => {
            if (event.type === "add") {
                acc.writeCount += event.count;
            } else if (event.type === "remove") {
                acc.writeCount += event.count;
            } else if (event.type === "query") {
                acc.readCount += 1;
                acc.totalResponseTime += event.duration;
            }

            return acc;
        }, innit);
        result.totalCost = 0; // costs are calculated separately, keeping for later optimizations

        return result;
    }

    /**
     * Process events for a database. The events are grouped by date and the daily statistics are updated.
     * If there are no statistics for a date, new statistics are created. If there are multiple statistics for a date,
     * a warning is logged.
     * @param databaseName
     * @param events
     * @private
     */
    private async processEventsForDatabase(databaseName: string, events: StatisticsEvent[]): Promise<void> {
        const eventsByDate = this.groupByDate(events); // events grouped by date
        const allStatistics = await getDailyStatisticsForDates(Array
            .from(eventsByDate.keys())
            .map((e) => convertToISODate(e)), databaseName);

        // process events for each date
        await Promise.all(Array.from(eventsByDate, async([date, events]) => {
            const filteredStatistics = allStatistics.filter(stat => stat.date === date);

            if (filteredStatistics.length === 0) {
                // if there are no statistics for the date, create new statistics
                const innit: DailyStatisticsAdd = {
                    date: format(new UTCDate(date), "yyyy-MM-dd"),
                    databaseName: databaseName,
                    writeCount: 0,
                    readCount: 0,
                    totalResponseTime: 0,
                    totalCost: 0
                };
                // apply statistics to the innit object
                await addDailyStatistics(this.applyStatistics(events, innit));

                //update general statistics
                await this.applyGeneralStatistics(databaseName, events);

            } else if (filteredStatistics.length === 1) {
                // if there are statistics for the date, update existing statistics
                const statistics = filteredStatistics[0];
                const innit: DailyStatisticsAdd = {
                    date: format(new UTCDate(date), "yyyy-MM-dd"),
                    databaseName: databaseName,
                    writeCount: statistics.writeCount,
                    readCount: statistics.readCount,
                    totalResponseTime: statistics.totalResponseTime,
                    totalCost: statistics.totalCost
                };
                // apply statistics to the innit object constructed from the existing statistics
                await addDailyStatistics(this.applyStatistics(events, innit)).then(() => {
                    // log.debug(`Statistics for database ${databaseName} and date ${date} processed`);
                });

                //update general statistics
                await this.applyGeneralStatistics(databaseName, events);

            } else {
                // if there are multiple statistics for the date, log an error
                // don't throw an error to not block the processing of other databases
                log.warn(`Multiple statistics for the same date ${date} and database ${databaseName}`);
            }
        }));
    }

    /**
     * Process events from the queue and store them as statistics
     * @param events - the events to process
     */
    public async processEvents(events: StatisticsEvent[]): Promise<number> {
        const eventsByDbName = this.groupByDbName(events);

        // start processing events for each database
        await Promise.all(Array.from(eventsByDbName, async([dbName, events]) => {
            try {
                return await this.processEventsForDatabase(dbName, events);
            } catch (error) {
                log.error(`Error processing statistics for database ${dbName}: ${error}`);
            }
        }));

        return events.length;
    }
}