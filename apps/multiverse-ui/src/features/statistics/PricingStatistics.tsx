"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import GeneralStatistics, { createProps } from "@/features/statistics/GeneralStatistics";
import useDateInterval from "@/features/statistics/use-date-interval";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import * as React from "react";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";
import { useMemo } from "react";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";

function Statistics() {
    const today = useMemo(() => new Date(), []);
    const { dateRange, handleDateIntervalChange } = useDateInterval({
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
    });

    const {
        data: generalStatistics, isLoading: genStatsIsLoading, isSuccess: genStatsIsSuccess, isError: genStatsIsError
    } = trpc.statistics.general.get.useQuery({
        database: undefined,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
    });

    const {
        data: dailyStatistics, isLoading: costsIsLoading, isSuccess: costsIsSuccess, isError: costsIsError
    } = trpc.statistics.daily.get.useQuery({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
    });

    const isSuccess = genStatsIsSuccess && costsIsSuccess;
    const isLoading = genStatsIsLoading || costsIsLoading;
    const isError = genStatsIsError || costsIsError;

    return (
        <>
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && dailyStatistics && generalStatistics && (<div className="flex flex-col w-full">
                <div className="flex flex-col pb-4">
                    <div className="flex flex-row justify-between items-center pb-8">
                        <SectionTitle title={"My plan"} className="flex h-fit" />
                        <DateIntervalPicker
                            getDate={() => dateRange}
                            setDate={handleDateIntervalChange}
                        />
                    </div>
                    <GeneralStatistics items={createProps(generalStatistics)} className="pb-8" />
                    <StatisticsGraph title="Costs" data={dailyStatistics.costs} unit={"$"} />
                </div>
            </div>)}
        </>);
}

export default function PricingStatistics() {
    const {
        data: awsToken, isLoading, isSuccess, isError
    } = trpc.awsToken.get.useQuery();

    return (
        <div className="flex">
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && !awsToken && (
                <div className="flex flex-col w-full py-16 items-center">
                    <h3 className="flex w-80 mb-8 text-center">
                        Missing AWS Token. To see your pricing, please provide AWS Token.
                    </h3>
                    <AddAWSTokenModal />
                </div>
            )}
            {isSuccess && awsToken && <Statistics />}
        </div>
    );
}