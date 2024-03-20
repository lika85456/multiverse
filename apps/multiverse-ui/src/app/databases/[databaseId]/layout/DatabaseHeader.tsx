"use client";

import PageTitle from "@/app/layout/components/PageTitle";
import Page404 from "@/app/not-found";
import { Separator } from "@/components/ui/separator";
import { getDatabaseById } from "@/features/database/dummy-databases";
import { IoClose } from "react-icons/io5";
import DatabaseInfo from "@/app/databases/[databaseId]/layout/DatabaseInfo";
import DatabaseSectionNavigation from "@/app/databases/[databaseId]/layout/DatabaseSectionNavigation";
import Link from "next/link";

export default function DatabaseHeader({ databaseId }: { databaseId: string }) {
    const database = getDatabaseById(databaseId);

    if (!database) return Page404();

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-row w-full items-center justify-between">
                <PageTitle title={database.name} />
                <Link href={"/databases"}>
                    <IoClose className="w-8 h-8 ml-auto" />
                </Link>
            </div>
            <DatabaseInfo database={database} />
            <DatabaseSectionNavigation databaseId={databaseId} />
            <Separator className="mb-4" />
        </div>
    );
}