"use client";

import { useState } from "react";

import { IoEyeOutline } from "react-icons/io5";
import { IoEyeOffOutline } from "react-icons/io5";
import { CopyIcon } from "lucide-react";
import DeleteConnectionTokenModal from "@/features/connectionToken/DeleteConnectionTokenModal";
import type { SecretToken } from "@/server/procedures/database";
import { customToast } from "@/features/fetching/CustomToast";

export interface ConnectionTokenItemProps {
  token: SecretToken;
}

export default function ConnectionTokenItem({ token, }: ConnectionTokenItemProps) {
    const [tokenVisible, setTokenVisible] = useState(false);

    const hiddenValue = "·".repeat(token.secret.length);

    const handleCopyToken = async() => {
        try {
            await navigator.clipboard.writeText(token.secret);
            customToast("Token have been copied into your clipboard.");
        } catch (error) {
            customToast.error("Token could not be copied.");
        }
    };

    return (
        <div className="flex fex-row h-10 rouanded-xl border-b boarder-border items-center hover:bg-secondary transition-all">
            <div className="flex w-full justify-between items-center mx-4">
                <div className="w-48 font-bold select-none truncate">{token.name}</div>
                <div className="flex flex-row text-sm text-accent_light-foreground font-mono h-6 tracking-[0.1rem] items-center bg-accent_light rounded-lg px-2 mx-4 my-1">
                    {tokenVisible && (
                        <div className="flex flex-row items-center select-none">
                            {token.secret}
                            <IoEyeOutline
                                className="w-4 h-4 mx-2 cursor-pointer"
                                onClick={() => setTokenVisible(!tokenVisible)}
                            />
                        </div>
                    )}
                    {!tokenVisible && (
                        <div className="flex flex-row items-center select-none">
                            {hiddenValue}
                            <IoEyeOffOutline
                                className="w-4 h-4 mx-2 cursor-pointer"
                                onClick={() => setTokenVisible(!tokenVisible)}
                            />
                        </div>
                    )}
                    <CopyIcon
                        className="w-4 h-4 cursor-pointer"
                        onClick={handleCopyToken}
                    />
                </div>
                <div className="flex flex-row">
                    <div className="text-secondary-foreground mr-2 select-none">
            Valid until
                    </div>
                    <div className="font-bold select-none w-40">
                        {new Date(token.validUntil).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </div>
                </div>
            </div>
            <div className="flex w-1/5 justify-end items-center">
                <DeleteConnectionTokenModal token={token} />
            </div>
        </div>
    );
}