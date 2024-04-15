"use client";

import GeneralStatistics, { createProps } from "@/features/statistics/GeneralStatistics";
import { Separator } from "@/components/ui/separator";
import DatabaseList from "@/app/(auth-required)/databases/components/DatabaseList";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";
import { useMemo } from "react";

export default function Databases() {
    const {
        data: awsToken, isLoading: awsIsLoading, isSuccess: awsTokenIsSuccess, isError: awsIsError
    } = trpc.awsToken.get.useQuery();

    const today = useMemo(() => new Date(), []); // memoized to prevent re-creation on every render, therefore infinite rerendering
    const {
        data: generalStatistics, isLoading: isStatsLoading, isSuccess: genStatsIsSuccess, isError: genStatsIsError
    } = trpc.statistics.general.get.useQuery({
        from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
        to: today.toISOString(),
    });

    const isSuccess = awsTokenIsSuccess && genStatsIsSuccess;
    const isLoading = awsIsLoading || isStatsLoading;
    const isError = awsIsError || genStatsIsError;

    return (
        <>
            {isLoading && <div> Loading... </div>}
            {isError && <div> Error </div>}
            {isSuccess && !awsToken && (
                <div className="flex flex-col w-full py-16 items-center">
                    <h3 className="flex w-80 mb-8 text-center">Missing AWS Token. To view your databases, please provide AWS Token.</h3>
                    <AddAWSTokenModal />
                </div>
            )}
            {isSuccess && awsToken && generalStatistics && (
                <>
                    <GeneralStatistics items={createProps(generalStatistics)} />
                    <Separator className="bg-border m-4" />
                    <DatabaseList />
                </>
            )}
        </>
    );
}