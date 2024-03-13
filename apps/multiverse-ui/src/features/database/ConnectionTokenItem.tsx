"use client";

import { useState } from "react";

import { IoEyeOutline } from "react-icons/io5";
import { IoEyeOffOutline } from "react-icons/io5";
import { CopyIcon, TrashIcon } from "lucide-react";

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

    return (
        <div
            className={
                "flex flex-row h-10 rounded-xl border border-border items-center"
            }
        >
            <div className={"flex w-full justify-between items-center mx-4"}>
                <div className={"font-bold"}>{token.name}</div>
                <div
                    className={
                        "flex flex-row text-sm text-accent_light-foreground font-mono h-6 tracking-[0.1rem] items-center bg-accent_light rounded-full px-2 mx-4 my-1"
                    }
                >
                    {tokenVisible && (
                        <div className={"flex flex-row items-center"}>
                            {token.tokenData}
                            <IoEyeOutline
                                className={"w-4 h-4 mx-2"}
                                onClick={() => setTokenVisible(!tokenVisible)}
                            />
                        </div>
                    )}
                    {!tokenVisible && (
                        <div className={"flex flex-row items-center"}>
                            {hiddenValue}
                            <IoEyeOffOutline
                                className={"w-4 h-4 mx-2"}
                                onClick={() => setTokenVisible(!tokenVisible)}
                            />
                        </div>
                    )}
                    <CopyIcon className={"w-4 h-4"} />
                </div>
                <div className={"flex flex-row"}>
                    <div className={"text-secondary-foreground mr-2"}>Valid until</div>
                    <div className={"font-bold"}>
                        {new Date(token.validity).toLocaleDateString("en-US")}
                    </div>
                </div>
            </div>
            <div className={"flex w-1/5 justify-end items-center"}>
                <TrashIcon className={"w-6 h-6 mx-4"} />
            </div>
        </div>
    );
}