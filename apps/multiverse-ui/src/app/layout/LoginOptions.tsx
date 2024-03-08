"use client";

import { LuLogIn } from "react-icons/lu";
import Link from "next/link";

export default function LoginOptions() {
    return (
        <Link href={"/login"}>
            <LuLogIn className="w-6 h-6 text-foreground m-2.5" />
        </Link>
    );
}