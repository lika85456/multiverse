import type { Event } from "@/lib/statistics-processor/event";
import type { DailyStatisticsAdd } from "@/lib/mongodb/collections/daily-statistics";
import { convertToISODate } from "@/lib/mongodb/collections/daily-statistics";
import { addDailyStatistics } from "@/lib/mongodb/collections/daily-statistics";
import { getDailyStatisticsForDates } from "@/lib/mongodb/collections/daily-statistics";
import {
    addGeneralDatabaseStatistics,
    getGeneralDatabaseStatistics
} from "@/lib/mongodb/collections/general-database-statistics";
import { UTCDate } from "@date-fns/utc";
import log from "@multiverse/log";

const VECTOR_SIZE = ((4 * 1536) + 500);

export class StatisticsProcessor {
    private startTime: number;
    constructor(startTime: number = performance.now()) {
        this.startTime = startTime;
    }

    /**
     * Group events by database name. The resulting map has database names as keys and arrays of events as values.
     * @param events - the events to group
     * @private
     */
    private groupByDbName(events: Event[]): Map<string, Event[]> {
        return events.reduce((acc, event) => {
            if (!acc.has(event.dbName)) {
                acc.set(event.dbName, []);
            }
            acc.get(event.dbName)?.push(event);

            return acc;
        }, new Map<string, Event[]>());
    }

    /**
     * Group events by date. The resulting map has dates as keys and arrays of events as values.
     * @param events - the events to group
     * @private
     */
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

    /**
     * Extract write data from the event. The write data contains the timestamp, total vectors, and data size.
     * @param event - the event to extract the write data from
     * @private
     */
    private extractWriteData(event: Event) {
        if (event.type === "add") {
            return {
                timestamp: event.timestamp,
                totalVectors: event.totalVectors,
                dataSize: event.totalVectors * VECTOR_SIZE, //TODO use returned data when provided
            };
        } else if (event.type === "remove") {
            return {
                timestamp: event.timestamp,
                totalVectors: event.totalVectors,
                dataSize: event.totalVectors * VECTOR_SIZE, //TODO use returned data when provided
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
    private applyGeneralStatistics(databaseName: string, events: Event[]): void {
        // asynchronously update general statistics if the latest event is newer
        getGeneralDatabaseStatistics(databaseName).then(async(generalStatistics) => {
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
        });
    }

    /**
     * Apply statistics to the daily statistics. The daily statistics contain the write count, read count, total response
     * @param events - the events to apply the statistics to
     * @param innit - the initial daily statistics
     * @private
     */
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
    private async processEventsForDatabase(databaseName: string, events: Event[]): Promise<void> {
        // log.debug(`Processing statistics for database ${databaseName}`);

        const eventsByDate = this.groupByDate(events);
        const allStatistics = await getDailyStatisticsForDates(Array
            .from(eventsByDate.keys())
            .map((e) => convertToISODate(e)), databaseName);

        // process events for each date
        Promise.all(Array.from(eventsByDate, async([date, events]) => {
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
                    // log.debug(`Statistics for database ${databaseName} and date ${date} processed`);
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
                    // log.debug(`Statistics for database ${databaseName} and date ${date} processed`);
                });

                //update general statistics
                this.applyGeneralStatistics(databaseName, events);

            } else {
                // if there are multiple statistics for the date, log an error
                // don't throw an error to not block the processing of other databases
                log.warn(`Multiple statistics for the same date ${date} and database ${databaseName}`);
            }
        })).then(() => {
            log.info(`${(performance.now() - this.startTime) / 1000} | Statistics for database ${databaseName} processed`);
        }).catch((error) => {
            log.error(`Error processing statistics for database ${databaseName}: ${error}`);
        });
    }

    /**
     * Process events from the queue and store them as statistics
     * @param events - the events to process
     * @param queueName - the name of the queue
     */
    public processEvents(events: Event[], queueName: string): void {
        const eventsByDbName = this.groupByDbName(events);

        // start processing events for each database
        Promise.all(Array.from(eventsByDbName, async([dbName, events]) => {
            try {
                await this.processEventsForDatabase(dbName, events);
            } catch (error) {
                log.error(`Error processing statistics for database ${dbName}: ${error}`);
            }
        })).then(() => {
            log.info(`${(performance.now() - this.startTime) / 1000} | Messages from queue ${queueName} were processed to statistics`);
        });
    }
}