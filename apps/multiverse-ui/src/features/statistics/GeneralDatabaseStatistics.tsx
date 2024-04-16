"use client";

import { useParams } from "next/navigation";
import GeneralStatistics, { createProps } from "@/features/statistics/GeneralStatistics";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { trpc } from "@/lib/trpc/client";
import { useMemo } from "react";

export default function GeneralDatabaseStatistics() {
    const params = useParams();
    const databaseCodeName = params.codeName as string;

    const today = useMemo(() => new Date(), []);
    const { data: generalStatistics, isSuccess } = trpc.statistics.general.get.useQuery({
        database: databaseCodeName,
        from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
        to: today.toISOString(),
    },);

    return (
        <div className="flex flex-col w-full">
            <SectionTitle title={"Statistics"} />
            {isSuccess && generalStatistics && <GeneralStatistics items={createProps(generalStatistics)} />}
        </div>
    );
}