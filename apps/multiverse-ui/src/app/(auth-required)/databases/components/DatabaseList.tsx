"use client";

import DatabaseItem from "@/app/(auth-required)/databases/components/DatabaseItem";
import CreateDatabaseModal from "@/features/database/CreateDatabaseModal";
import { trpc } from "@/lib/trpc/client";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";
import Spinner from "@/features/fetching/Spinner";

export const DbsToCreate = ({ dbsToCreate }: {dbsToCreate: string[]}) => {
    if (!dbsToCreate || dbsToCreate.length === 0) return null;

    const displayedDbs = dbsToCreate.slice(0, 2);
    const displayedDbsCount = displayedDbs.length;
    const restDbsCount = dbsToCreate.length - displayedDbsCount;

    const displayedDbsString = displayedDbs.map((dbs) => `"${dbs}"`).join(", ");
    const restDbsString = restDbsCount > 0 ? ` +${restDbsCount}` : "";

    return (
        <div className="flex flex-row items-center justify-center w-full bg-success/60 py-2 my-2 rounded-md space-x-2">
            <Spinner colorResolver={() => "#000"}/>
            <p className="text-success-foreground ml-2">{`Creating database${dbsToCreate.length > 1 ? "s" : ""} ${displayedDbsString}${restDbsString}.`}</p>
        </div>
    );
};

export const DbsToDelete = ({ dbsToDelete }: {dbsToDelete: string[]}) => {
    if (!dbsToDelete || dbsToDelete.length === 0) return null;

    const displayedDbs = dbsToDelete.slice(0, 2);
    const displayedDbsCount = displayedDbs.length;
    const restDbsCount = dbsToDelete.length - displayedDbsCount;

    const displayedDbsString = displayedDbs.map((dbs) => `"${dbs}"`).join(", ");
    const restDbsString = restDbsCount > 0 ? ` +${restDbsCount}` : "";

    return (
        <div className="flex flex-row items-center justify-center w-full bg-warning/70 py-2 my-2 rounded-md space-x-2">
            <Spinner colorResolver={() => "#000"}/>
            <p className="text-warning-foreground ml-2">{`Deleting database${dbsToDelete.length > 1 ? "s" : ""} ${displayedDbsString}${restDbsString}.`}</p>
        </div>
    );
};

export default function DatabaseList() {
    const {
        data: databases, isError, isSuccess, isLoading
    } = trpc.database.list.useQuery();

    return (
        <>
            <CreateDatabaseModal />

            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && databases && (
                <>
                    <DbsToCreate dbsToCreate={databases.dbsToBeCreated} />
                    <DbsToDelete dbsToDelete={databases.dbsToBeDeleted } />
                    <ul className="flex flex-col w-full py-4 space-y-4">
                        {databases.databases.length === 0 && (
                            <div className="flex flex-col items-center justify-center w-full">
                                <p className="text-secondary-foreground">No databases found</p>
                            </div>
                        )}
                        {databases.databases.length !== 0 && databases.databases.map((createdDatabase) => {
                            return (
                                <li key={createdDatabase.codeName}>
                                    <DatabaseItem database={createdDatabase} />
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </>
    );
}