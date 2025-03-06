"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import * as React from "react";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import useDateInterval from "@/features/statistics/use-date-interval";
import { trpc } from "@/lib/trpc/client";
import { useParams } from "next/navigation";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";
import { useEffect } from "react";
import type { GraphData } from "@/server/procedures/statistics";
import { Warning } from "@/features/fetching/Warning";
import StatisticsDisclaimer from "@/features/statistics/StatisticsDisclaimer";

export default function DatabaseStatistics() {
    const codeName = useParams().codeName as string;
    const { dateRange, handleDateIntervalChange } = useDateInterval();

    const [data, setData] = React.useState<GraphData>({
        reads: [],
        writes: [],
        costs: [],
        responseTime: [],
    });

    const {
        data: dailyStatistics, isLoading, isError
    } = trpc.statistics.daily.get.useQuery({
        database: codeName,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
    });

    useEffect(() => {
        if (!dailyStatistics) return;
        setData({
            reads: dailyStatistics.reads,
            writes: dailyStatistics.writes,
            costs: dailyStatistics.costs,
            costsEnabled: dailyStatistics.costsEnabled,
            responseTime: dailyStatistics.responseTime,
        });

    }, [dailyStatistics]);

    return (
        <div className="flex flex-col">
            {!isError && (!data || data.reads.length === 0) && isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {!isError && data && (
                <div className="flex flex-col w-full items-end pb-16">
                    <StatisticsDisclaimer/>
                    {data.costsEnabled !== undefined && !data.costsEnabled && (
                        <Warning>
                            Costs calculation is turned off.
                        </Warning>
                    )}
                    <DateIntervalPicker
                        className="self-end"
                        getDate={() => dateRange}
                        setDate={handleDateIntervalChange}
                    />
                    <StatisticsGraph title="Queries" data={data.reads}/>
                    <StatisticsGraph title="Write Count" data={data.writes}/>
                    {!!data.costsEnabled && <StatisticsGraph title="Costs" data={data.costs} unit={"$"}/>}
                    <StatisticsGraph title="Response Time" data={data.responseTime}/>
                </div>)
            }
        </div>
    );
}