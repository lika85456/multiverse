import { TailSpin } from "react-loader-spinner";
import * as React from "react";
import { useTheme } from "next-themes";

export default function Spinner({ colorResolver }: {colorResolver?: () => string }) {
    const { resolvedTheme, setTheme } = useTheme();
    if (!resolvedTheme) setTheme("dark") ;

    const finalColor = colorResolver ? colorResolver() : resolvedTheme === "dark" ? "#fff" : "#000";

    return <TailSpin
        height="24"
        width="24"
        color={finalColor}
        ariaLabel="tail-spin-loading"
        radius="1"
    />;
}