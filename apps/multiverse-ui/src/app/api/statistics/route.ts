import { StatisticsProcessor } from "@/features/statistics/statistics-processor/StatisticsProcessor";

export function POST() {
    const statisticsProcessor = new StatisticsProcessor();
    statisticsProcessor.processQueueMessages().then(() => {
        console.log("Processing users queue");
    });
}