"use client";

import DatabaseItem from "@/app/databases/components/DatabaseItem";
import CreateDatabaseModal from "@/features/database/CreateDatabaseModal";
import { trpc } from "@/_trpc/client";
import { Suspense } from "react";

export default function DatabaseList() {
    const databases = trpc.getDatabases.useQuery();

    return (
        <>
            <CreateDatabaseModal />
            <Suspense fallback={<div>Loading...</div>}>
                {databases.data && (
                    <ul className="flex flex-col w-full py-4 space-y-4">
                        {databases.data.map((database) => {
                            return (
                                <li key={database.codeName}>
                                    <DatabaseItem database={database} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Suspense>
        </>
    );
}