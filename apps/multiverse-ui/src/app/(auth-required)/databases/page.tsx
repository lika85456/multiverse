"use client";

import * as React from "react";
import GeneralStatistics, { createProps } from "@/features/statistics/GeneralStatistics";
import useDateInterval from "@/features/statistics/use-date-interval";
import { Separator } from "@/components/ui/separator";
import DatabaseList from "@/app/(auth-required)/databases/components/DatabaseList";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";
import { useMemo } from "react";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";
import { UTCDate } from "@date-fns/utc";

function Statistics() {
    const today = useMemo(() => new UTCDate(), []);
    const { dateRange } = useDateInterval({
        from: new UTCDate(today.getFullYear(), today.getMonth(), 1),
        to: today,
    });

    const {
        data: generalStatistics, isLoading, isSuccess, isError
    } = trpc.statistics.general.get.useQuery({
        database: undefined,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
    });

    return (
        <>
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && generalStatistics && (
                <>
                    <GeneralStatistics items={createProps(generalStatistics)} />
                </>
            )}
        </>
    );
}

export default function Databases() {
    const {
        data: awsToken, isLoading, isSuccess, isError
    } = trpc.awsToken.get.useQuery();

    return (
        <>
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && !awsToken && (
                <div className="flex flex-col w-full py-16 items-center">
                    <h3 className="flex w-80 mb-8 text-center">
                        Missing AWS Token. To view your databases, please provide AWS Token.
                    </h3>
                    <AddAWSTokenModal />
                </div>
            )}
            {isSuccess && awsToken && (
                <>
                    <Statistics />
                    <Separator className="bg-border m-4" />
                    <DatabaseList />
                </>
            )}
        </>
    );
}