"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import * as React from "react";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import useDateInterval from "@/features/statistics/use-date-interval";
import { trpc } from "@/lib/trpc/client";

export default function DatabaseStatistics() {
    const { date, handleDateIntervalChange } = useDateInterval();

    const {
        data: statistics, isLoading, isError, isSuccess
    } = trpc.statistics.graphStatistics.get.useQuery({
        from: date.from.toDateString(),
        to: date.to.toDateString(),
    });

    return (
        <div className="flex flex-col">
            {isLoading && <div> Loading... </div>}
            {isError && <div> Error </div>}
            {isSuccess && statistics && (
                <>
                    <DateIntervalPicker
                        className="self-end"
                        getDate={() => date}
                        setDate={handleDateIntervalChange}
                    />
                    <StatisticsGraph title="Requests" data={statistics.requests.data} />
                    <StatisticsGraph title="Costs" data={statistics.costs.data} />
                    <StatisticsGraph title="Response Time" data={statistics.responseTime.data} />
                    <StatisticsGraph title="Write Count" data={statistics.writeCount.data} />
                </>)
            }
        </div>
    );
}