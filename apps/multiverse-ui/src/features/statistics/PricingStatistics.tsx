"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import GeneralStatistics, { createProps } from "@/features/statistics/GeneralStatistics";
import useDateInterval from "@/features/statistics/use-date-interval";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import * as React from "react";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";

export default function PricingStatistics() {
    const today = new Date();
    const { date, handleDateIntervalChange } = useDateInterval({
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
    });

    const {
        data: awsToken, isLoading: awsTokenIsLoading, isSuccess: awsTokenIsSuccess, isError: awsTokenIsError
    } = trpc.awsToken.get.useQuery();
    const {
        data: generalStatistics, isLoading: genStatsIsLoading, isSuccess: genStatsIsSuccess, isError: genStatsIsError
    } = trpc.statistics.general.get.useQuery({
        database: undefined,
        from: date.from.toISOString(),
        to: date.to.toISOString()
    });
    const {
        data: dailyStatistics, isLoading: costsIsLoading, isSuccess: costsIsSuccess, isError: costsIsError
    } = trpc.statistics.daily.get.useQuery({
        from: date.from.toISOString(),
        to: date.to.toISOString()
    });
    const isLoading = awsTokenIsLoading || genStatsIsLoading || costsIsLoading;
    const isError = awsTokenIsError || genStatsIsError || costsIsError;
    const isSuccess = awsTokenIsSuccess && genStatsIsSuccess && costsIsSuccess;

    return (
        <>
            {isLoading && <div> Loading... </div>}
            {isError && <div> Error </div>}
            {isSuccess && !awsToken && (
                <div className="flex flex-col w-full py-16 items-center">
                    <h3 className="flex w-80 mb-8 text-center">Missing AWS Token. To see your pricing, please provide AWS Token.</h3>
                    <AddAWSTokenModal />
                </div>
            )}
            {isSuccess && awsToken && dailyStatistics && generalStatistics && (<div className="flex flex-col w-full">
                <div className="flex flex-col">
                    <div className="flex flex-row justify-between items-center pb-8">
                        <SectionTitle title={"My plan"} className="flex h-fit" />
                        <DateIntervalPicker
                            getDate={() => date}
                            setDate={handleDateIntervalChange}
                        />
                    </div>
                    <GeneralStatistics items={createProps(generalStatistics)} className="pb-8" />
                    <StatisticsGraph title="Costs" data={dailyStatistics.costs.data} unit={dailyStatistics.costs.unit} />
                    <Separator className="my-4" />
                </div>
            </div>)}
        </>
    );
}