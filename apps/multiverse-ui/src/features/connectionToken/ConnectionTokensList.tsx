"use client";

import SectionTitle from "@/app/layout/components/SectionTitle";
import ConnectionTokenItem from "@/features/connectionToken/ConnectionTokenItem";
import CreateConnectionTokenModal from "@/features/connectionToken/CreateConnectionTokenModal";
import { trpc } from "@/lib/trpc/client";
import { useParams } from "next/navigation";

export default function ConnectionTokensList() {
    const databaseCodename = useParams().codeName as string;
    const database = trpc.database.get.useQuery(databaseCodename);
    if (!database.data) {
        return null;
    }
    const tokens = database.data.secretTokens;

    // const connectionTokens = trpc.getConnectionTokens.useQuery();
    // const tokens = connectionTokens.data ?? [];

    return (
        <>
            <SectionTitle title={"Connection tokens"} />
            <ul className="flex w-full flex-col my-4 space-y-4">
                {tokens.map((token) => {
                    return (
                        <li key={token.name}>
                            <ConnectionTokenItem token={token} />
                        </li>
                    );
                })}
            </ul>
            <CreateConnectionTokenModal />
        </>
    );
}