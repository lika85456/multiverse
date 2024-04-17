"use client";

import { TailSpin } from "react-loader-spinner";
import * as React from "react";
import { useTheme } from "next-themes";

export default function Spinner() {
    const { resolvedTheme, setTheme } = useTheme();
    if (!resolvedTheme) setTheme("dark") ;

    return <TailSpin
        visible={true}
        height="24"
        width="24"
        color={resolvedTheme === "dark" ? "#fff" : "#000"}
        ariaLabel="tail-spin-loading"
        radius="1"
        wrapperStyle={{}}
        wrapperClass=""
    />;
}