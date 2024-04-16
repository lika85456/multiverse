"use client";

import DatabaseItem from "@/app/(auth-required)/databases/components/DatabaseItem";
import CreateDatabaseModal from "@/features/database/CreateDatabaseModal";
import { trpc } from "@/lib/trpc/client";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";

export default function DatabaseList() {
    const {
        data: databases, isError, isSuccess, isLoading
    } = trpc.database.list.useQuery();

    return (
        <>
            <CreateDatabaseModal />
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
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