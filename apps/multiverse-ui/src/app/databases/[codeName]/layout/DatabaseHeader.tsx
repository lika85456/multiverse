"use client";

import PageTitle from "@/app/layout/components/PageTitle";
import Page404 from "@/app/not-found";
import { Separator } from "@/components/ui/separator";
import { IoClose } from "react-icons/io5";
import DatabaseInfo from "@/app/databases/[codeName]/layout/DatabaseInfo";
import DatabaseSectionNavigation from "@/app/databases/[codeName]/layout/DatabaseSectionNavigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { trpc } from "@/_trpc/client";

export default function DatabaseHeader({
    databaseCodeName,
    children,
}: {
  databaseCodeName: string;
  children: ReactNode;
}) {
    const database = trpc.getDatabaseByCodeName.useQuery(databaseCodeName);

    if (!database.data) return Page404();

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-row w-full items-center justify-between">
                <PageTitle title={database.data.name} />
                <Link href={"/databases"}>
                    <IoClose className="w-8 h-8 ml-auto" />
                </Link>
            </div>
            <DatabaseInfo database={database.data} />
            <DatabaseSectionNavigation database={database.data} />
            <Separator className="mb-4" />
            {children}
        </div>
    );
}