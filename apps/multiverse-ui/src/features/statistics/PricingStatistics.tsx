"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import useDateInterval from "@/features/statistics/use-date-interval";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import * as React from "react";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";

export default function PricingStatistics() {
    const { date, handleDateIntervalChange } = useDateInterval();

    const {
        data: awsToken, isLoading: awsTokenIsLoading, isSuccess: awsTokenIsSuccess, isError: awsTokenIsError
    } = trpc.awsToken.get.useQuery();
    const {
        data: items, isLoading: itemsIsLoading, isSuccess: itemsIsSuccess, isError: itemsIsError
    } = trpc.statistics.generalPricing.get.useQuery();
    const {
        data: costs, isLoading: costsIsLoading, isSuccess: costsIsSuccess, isError: costsIsError
    } = trpc.statistics.costs.get.useQuery({
        from: date.from.toDateString(),
        to: date.to.toDateString()
    });
    const isLoading = awsTokenIsLoading || itemsIsLoading || costsIsLoading;
    const isError = awsTokenIsError || itemsIsError || costsIsError;
    const isSuccess = awsTokenIsSuccess && itemsIsSuccess && costsIsSuccess;

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
            {isSuccess && awsToken && costs && (<div className="flex flex-col w-full">
                <div className="flex flex-col">
                    <div className="flex flex-row justify-between items-center pb-8">
                        <SectionTitle title={"My plan"} className="flex h-fit" />
                        <DateIntervalPicker
                            getDate={() => date}
                            setDate={handleDateIntervalChange}
                        />
                    </div>
                    <GeneralStatistics items={items} className="pb-8" />
                    <StatisticsGraph title={costs.title} data={costs.data} />
                    <Separator className="my-4" />
                </div>
            </div>)}
        </>
    );
}