"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import useDateInterval from "@/features/statistics/use-date-interval";
import format from "@/features/statistics/format";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import * as React from "react";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";

const items = [
    {
        label: "Total Cost",
        value: `$ ${format(27.13, "delim")}`,
    },
    {
        label: "Total Records",
        value: `${format(7800000, "compact")} (${format(150000000000, "bytes")})`,
    },
    {
        label: "Queries",
        value: `${format(1200000, "compact")}`,
    },
    {
        label: "Writes",
        value: `${format(400000, "compact")}`,
    },
];

const costs = {
    title: "Costs",
    data: {
        unit: "$",
        values: [
            {
                value: 124,
                timeString: "2022-01-01",
            },
            {
                value: 25,
                timeString: "2022-01-02",
            },
            {
                value: 137,
                timeString: "2022-01-03",
            },
            {
                value: 427,
                timeString: "2022-01-04",
            },
            {
                value: 102,
                timeString: "2022-01-05",
            },
            {
                value: 150,
                timeString: "2022-01-06",
            },
            {
                value: 400,
                timeString: "2022-01-07",
            },
        ],
    },
};

export default function PricingStatistics() {
    const { date, handleDateIntervalChange } = useDateInterval();

    const {
        data: awsToken, isLoading, isSuccess, isError
    } = trpc.awsToken.get.useQuery();

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
            {isSuccess && awsToken && (<div className="flex flex-col w-full">
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