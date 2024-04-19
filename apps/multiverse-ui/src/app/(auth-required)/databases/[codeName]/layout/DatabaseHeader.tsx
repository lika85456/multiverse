"use client";

import PageTitle from "@/app/layout/components/PageTitle";
import Page404 from "@/app/not-found";
import { Separator } from "@/components/ui/separator";
import { IoClose } from "react-icons/io5";
import DatabaseInfo from "@/app/(auth-required)/databases/[codeName]/layout/DatabaseInfo";
import DatabaseSectionNavigation from "@/app/(auth-required)/databases/[codeName]/layout/DatabaseSectionNavigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { trpc } from "@/lib/trpc/client";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";
import { redirect } from "next/navigation";

export default function DatabaseHeader({
    databaseCodeName,
    children,
}: {
  databaseCodeName: string;
  children: ReactNode;
}) {
    const {
        data: result, isError, error, isSuccess, isLoading
    } = trpc.database.get.useQuery(databaseCodeName);

    // If the database was not created yet, redirect to the databases page
    if (isSuccess && result && result.state !== "created") {
        return redirect("/databases");
    }
    // If the database does not exist, return a 404 page
    if (isError && error) {
        if (error.data?.code === "NOT_FOUND")
            return Page404();

        return <GeneralError />;
    }

    return (
        <>
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && result && result.database && (
                <div className="flex flex-col w-full">
                    <div className="flex flex-row w-full items-center justify-between">
                        <PageTitle title={result.database.name} />
                        <Link href={"/databases"}>
                            <IoClose className="w-8 h-8 ml-auto" />
                        </Link>
                    </div>
                    <DatabaseInfo database={result.database} />
                    <DatabaseSectionNavigation database={result.database} />
                    <Separator className="mb-4" />
                    {children}
                </div>)}
        </>
    );
}