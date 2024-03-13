import SectionTitle from "@/app/layout/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { IoAdd } from "react-icons/io5";
import ConnectionTokenItem from "@/features/database/ConnectionTokenItem";

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
    // {
    //     tokenId: "3",
    //     name: "Token 2",
    //     tokenData: "725e6ca495fd5957",
    //     validity: Date.now(),
    // },
    // {
    //     tokenId: "4",
    //     name: "Token 2",
    //     tokenData: "725e6ca495fd5957",
    //     validity: Date.now(),
    // },
    // {
    //     tokenId: "5",
    //     name: "Token 2",
    //     tokenData: "725e6ca495fd5957",
    //     validity: Date.now(),
    // },
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
            <Button
                className={
                    "flex w-fit self-end text-accent_light-foreground bg-accent hover:bg-accent_light"
                }
            >
                <IoAdd className={"w-6 h-6 mr-2"} /> Create token
            </Button>
        </>
    );
}