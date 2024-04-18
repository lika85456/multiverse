"use client";

import SectionTitle from "@/app/layout/components/SectionTitle";
import ConnectionTokenItem from "@/features/connectionToken/ConnectionTokenItem";
import CreateConnectionTokenModal from "@/features/connectionToken/CreateConnectionTokenModal";
import { trpc } from "@/lib/trpc/client";
import { notFound, useParams } from "next/navigation";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";

export default function ConnectionTokensList() {
    const databaseCodename = useParams().codeName as string;
    const {
        data: database, isSuccess, isLoading, isError
    } = trpc.database.get.useQuery(databaseCodename);
    if (!database && isSuccess) {
        return notFound();
    }

    const tokens = database?.secretTokens;

    // const connectionTokens = trpc.getConnectionTokens.useQuery();
    // const tokens = connectionTokens.data ?? [];

    return (
        <>
            <SectionTitle title={"Connection tokens"} />
            {isLoading && <Loading/>}
            {isError && <GeneralError/>}
            {isSuccess && tokens && tokens.length > 0 && <ul className="flex w-full flex-col my-4 space-y-4">
                {tokens.map((token) => {
                    return (
                        <li key={token.name}>
                            <ConnectionTokenItem token={token} />
                        </li>
                    );
                })}
            </ul>}
            {isSuccess && tokens && tokens.length === 0 && (
                <div className="text-center text-primary-foreground py-4">
                    No connection tokens found
                </div>
            )}
            <CreateConnectionTokenModal codeName={databaseCodename} />
        </>
    );
}