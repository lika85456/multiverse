"use client";

import { useParams } from "next/navigation";
import format from "@/features/statistics/format";
import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import SectionTitle from "@/app/layout/components/SectionTitle";

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

export default function GeneralDatabaseStatistics() {
    const params = useParams();
    const databaseCodeName = params.codeName as string;

    // const database = getDatabaseById(databaseCodeName);
    // if (!database) return null;

    return (
        <div className="flex flex-col w-full">
            <SectionTitle title={"Statistics"} />
            <GeneralStatistics items={items} />
        </div>
    );
}