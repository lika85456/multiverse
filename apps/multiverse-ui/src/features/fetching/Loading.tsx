"use client";

import * as React from "react";
import { TailSpin } from "react-loader-spinner";
import { useTheme } from "next-themes";

export default function Loading() {
    const { resolvedTheme, setTheme } = useTheme();
    if (!resolvedTheme) setTheme("dark") ;

    return (
        <div className="flex w-full justify-center items-center my-4">
            <div className="flex flex-row border border-border space-x-2 rounded-xl p-2">
                <TailSpin
                    visible={true}
                    height="24"
                    width="24"
                    color={resolvedTheme === "dark" ? "#fff" : "#000"}
                    ariaLabel="tail-spin-loading"
                    radius="1"
                    wrapperStyle={{}}
                    wrapperClass=""
                />
                <div>
            Loading...
                </div>
            </div>
        </div>);
}