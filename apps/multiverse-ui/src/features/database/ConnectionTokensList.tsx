import SectionTitle from "@/app/layout/components/SectionTitle";
import ConnectionTokenItem from "@/features/database/ConnectionTokenItem";
import CreateConnectionTokenModal from "@/features/database/CreateConnectionTokenModal";

const tokens = [
    {
        tokenId: "1",
        name: "Token 1",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "2",
        name: "Token 2",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
];

export default function ConnectionTokensList() {
    return (
        <>
            <SectionTitle title={"Connection tokens"} />
            <ul className={"flex w-full flex-col my-4 space-y-4"}>
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