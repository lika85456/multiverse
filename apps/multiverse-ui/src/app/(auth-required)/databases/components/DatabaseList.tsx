"use client";

import DatabaseItem from "@/app/(auth-required)/databases/components/DatabaseItem";
import CreateDatabaseModal from "@/features/database/CreateDatabaseModal";
import { trpc } from "@/lib/trpc/client";
import { Suspense } from "react";

export default function DatabaseList() {
    const {
        data: databases, isError, isFetched
    } = trpc.getDatabases.useQuery();

    return (
        <>
            <CreateDatabaseModal />
            <Suspense fallback={<div>Loading...</div>}>
                {databases && (
                    <ul className="flex flex-col w-full py-4 space-y-4">
                        {databases.map((database) => {
                            return (
                                <li key={database.codeName}>
                                    <DatabaseItem database={{
                                        ...database,
                                        records: 0,
                                    }} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Suspense>
        </>
    );
}