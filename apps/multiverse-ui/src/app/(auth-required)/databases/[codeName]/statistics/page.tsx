"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import * as React from "react";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import useDateInterval from "@/features/statistics/use-date-interval";
import { trpc } from "@/lib/trpc/client";
import { useParams } from "next/navigation";

export default function DatabaseStatistics() {
    const codeName = useParams().codeName as string;
    const { date, handleDateIntervalChange } = useDateInterval();

    const {
        data: dailyStatistics, isLoading, isError, isSuccess
    } = trpc.statistics.daily.get.useQuery({
        database: codeName,
        from: date.from.toISOString(),
        to: date.to.toISOString(),
    });

    return (
        <div className="flex flex-col">
            {isLoading && <div> Loading... </div>}
            {isError && <div> Error </div>}
            {isSuccess && dailyStatistics && (
                <>
                    <DateIntervalPicker
                        className="self-end"
                        getDate={() => date}
                        setDate={handleDateIntervalChange}
                    />
                    <StatisticsGraph title="Requests" data={dailyStatistics.reads} />
                    <StatisticsGraph title="Write Count" data={dailyStatistics.writes} />
                    <StatisticsGraph title="Costs" data={dailyStatistics.costs} unit={"$"}/>
                    <StatisticsGraph title="Response Time" data={dailyStatistics.responseTime} />
                </>)
            }
        </div>
    );
}