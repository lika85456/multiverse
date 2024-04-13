"use client";

import DatabaseItem from "@/app/(auth-required)/databases/components/DatabaseItem";
import CreateDatabaseModal from "@/features/database/CreateDatabaseModal";
import { trpc } from "@/lib/trpc/client";

export default function DatabaseList() {
    const {
        data: databases, isError, isSuccess, isLoading
    } = trpc.database.list.useQuery();

    return (
        <>
            <CreateDatabaseModal />
            {isError && <div> Error </div>}
            {isLoading && <div> Loading... </div>}
            {databases && isSuccess && (
                <ul className="flex flex-col w-full py-4 space-y-4">
                    {databases.map((database) => {
                        return (
                            <li key={database.codeName}>
                                <DatabaseItem database={{ ...database, }} />
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}