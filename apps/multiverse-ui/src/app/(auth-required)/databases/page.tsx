"use client";

import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import { Separator } from "@/components/ui/separator";
import DatabaseList from "@/app/(auth-required)/databases/components/DatabaseList";
import format from "@/features/statistics/format";
import { trpc } from "@/lib/trpc/client";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";

const items = [
    {
        label: "Total Cost",
        value: `$ ${format(12.47)}`,
    },
    {
        label: "Data Size",
        value: `${format(2300000000, "bytes")}`,
    },
    {
        label: "Total Records",
        value: `${format(2537291)}`,
    },
    {
        label: "Queries",
        value: `${format(627000, "compact")}`,
    },
];

export default function Databases() {
    const {
        data: awsToken, isLoading, isSuccess, isError
    } = trpc.awsToken.get.useQuery();

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
            {isSuccess && awsToken && (
                <>
                    <GeneralStatistics items={items} />
                    <Separator className="bg-border m-4" />
                    <DatabaseList />
                </>
            )}
        </>
    );
}