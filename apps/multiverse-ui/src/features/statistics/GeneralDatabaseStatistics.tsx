"use client";

import { useParams } from "next/navigation";
import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { trpc } from "@/lib/trpc/client";

export default function GeneralDatabaseStatistics() {
    const params = useParams();
    const databaseCodeName = params.codeName as string;

    const { data: items } = trpc.statistics.general.get.useQuery({ databaseCodeName },);

    return (
        <div className="flex flex-col w-full">
            <SectionTitle title={"Statistics"} />
            <GeneralStatistics items={items} />
        </div>
    );
}