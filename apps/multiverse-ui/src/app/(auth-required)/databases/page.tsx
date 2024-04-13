"use client";

import GeneralStatistics, { createProps } from "@/features/statistics/GeneralStatistics";
import { Separator } from "@/components/ui/separator";
import DatabaseList from "@/app/(auth-required)/databases/components/DatabaseList";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";

export default function Databases() {
    const {
        data: awsToken, isLoading, isSuccess: awsTokenIsSuccess, isError
    } = trpc.awsToken.get.useQuery();

    const today = new Date();
    const { data: generalStatistics, isSuccess: genStatsIsSuccess } = trpc.statistics.general.get.useQuery({
        database: undefined,
        from: new Date(today.getFullYear(), today.getMonth(), 1).toDateString(),
        to: today.toDateString(),
    });

    const isSuccess = awsTokenIsSuccess && genStatsIsSuccess;

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