"use client";

import PageTitle from "@/app/layout/components/PageTitle";
import { useParams, usePathname } from "next/navigation";
import Page404 from "@/app/not-found";
import { Separator } from "@/components/ui/separator";
import { getDatabaseById } from "@/features/database/dummy-databases";
import { IoClose } from "react-icons/io5";
import DatabaseInfo from "@/app/databases/[databaseId]/layout/DatabaseInfo";
import DatabaseSectionNavigation from "@/app/databases/[databaseId]/layout/DatabaseSectionNavigation";
import Link from "next/link";

export default function DatabaseHeader() {
    const params = useParams();
    const databaseId = params.databaseId as string;
    const database = getDatabaseById(databaseId);

    if (!database) return Page404();

    return (
        <div className={"flex flex-col w-full"}>
            <div className={"flex flex-row w-full items-center justify-between"}>
                <PageTitle title={database.name} />
                <Link href={"/databases"}>
                    <IoClose className={"w-8 h-8 ml-auto"} />
                </Link>
            </div>
            <DatabaseInfo
                codename={database.codename}
                locality={database.locality}
                dimensions={database.dimensions}
                metrics={database.metrics}
            />
            <DatabaseSectionNavigation />
            <Separator className={"mb-4"} />
            {/*<GeneralStatistics items={} />*/}
        </div>
    );
}