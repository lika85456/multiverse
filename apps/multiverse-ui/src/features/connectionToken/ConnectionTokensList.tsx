"use client";

import SectionTitle from "@/app/layout/components/SectionTitle";
import ConnectionTokenItem from "@/features/connectionToken/ConnectionTokenItem";
import CreateConnectionTokenModal from "@/features/connectionToken/CreateConnectionTokenModal";
import { trpc } from "@/_trpc/client";

export default function ConnectionTokensList() {
    const connectionTokens = trpc.getConnectionTokens.useQuery();
    const tokens = connectionTokens.data ?? [];

    return (
        <>
            <SectionTitle title={"Connection tokens"} />
            <ul className="flex w-full flex-col my-4 space-y-4">
                {tokens.map((token) => {
                    return (
                        <li key={token.tokenId}>
                            <ConnectionTokenItem token={token} />
                        </li>
                    );
                })}
            </ul>
            <CreateConnectionTokenModal />
        </>
    );
}