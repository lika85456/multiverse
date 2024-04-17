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
                    {databases.length === 0 && (
                        <div className="flex flex-col items-center justify-center w-full">
                            <p className="text-secondary-foreground">No databases found</p>
                        </div>
                    )}
                    {databases.length !== 0 && databases.map((database) => {
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