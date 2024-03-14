"use client";

import { useState } from "react";

import { IoEyeOutline } from "react-icons/io5";
import { IoEyeOffOutline } from "react-icons/io5";
import { CopyIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import DeleteTokenModal from "@/features/database/DeleteTokenModal";

export interface ConnectionTokenItemProps {
  token: {
    tokenId: string;
    name: string;
    tokenData: string;
    validity: number;
  };
}

export default function ConnectionTokenItem({ token, }: ConnectionTokenItemProps) {
    const [tokenVisible, setTokenVisible] = useState(false);

    const hiddenValue = "·".repeat(token.tokenData.length);

    const handleCopyToken = () => {
        navigator.clipboard
            .writeText(token.tokenData)
            .then(() => {
                toast("Token have been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Token could not be copied.");
            });
    };

    return (
        <div
            className={
                "flex flex-row h-10 rounded-xl border border-border items-center"
            }
        >
            <div className={"flex w-full justify-between items-center mx-4"}>
                <div className={"font-bold select-none"}>{token.name}</div>
                <div
                    className={
                        "flex flex-row text-sm text-accent_light-foreground font-mono h-6 tracking-[0.1rem] items-center bg-accent_light rounded-full px-2 mx-4 my-1"
                    }
                >
                    {tokenVisible && (
                        <div className={"flex flex-row items-center select-none"}>
                            {token.tokenData}
                            <IoEyeOutline
                                className={"w-4 h-4 mx-2 cursor-pointer"}
                                onClick={() => setTokenVisible(!tokenVisible)}
                            />
                        </div>
                    )}
                    {!tokenVisible && (
                        <div className={"flex flex-row items-center select-none"}>
                            {hiddenValue}
                            <IoEyeOffOutline
                                className={"w-4 h-4 mx-2 cursor-pointer"}
                                onClick={() => setTokenVisible(!tokenVisible)}
                            />
                        </div>
                    )}
                    <CopyIcon
                        className={"w-4 h-4 cursor-pointer"}
                        onClick={handleCopyToken}
                    />
                </div>
                <div className={"flex flex-row"}>
                    <div className={"text-secondary-foreground mr-2 select-none"}>
            Valid until
                    </div>
                    <div className={"font-bold select-none"}>
                        {new Date(token.validity).toLocaleDateString("en-US")}
                    </div>
                </div>
            </div>
            <div className={"flex w-1/5 justify-end items-center"}>
                <DeleteTokenModal />
            </div>
        </div>
    );
}