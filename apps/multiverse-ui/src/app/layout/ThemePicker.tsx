"use client";

import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { useTheme } from "next-themes";

const ThemePicker = () => {
    const { theme, setTheme } = useTheme();

    return theme === "dark" ? (
        <button onClick={() => setTheme("light")}>
            <IoMoonOutline className="w-6 h-6 text-foreground m-2.5" />
        </button>
    ) : (
        <button onClick={() => setTheme("dark")}>
            <IoSunnyOutline className="w-6 h-6 text-foreground m-2.5" />
        </button>
    );
};

export default ThemePicker;