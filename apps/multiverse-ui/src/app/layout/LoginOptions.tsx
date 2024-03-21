"use client";

import { LuLogIn } from "react-icons/lu";
import Link from "next/link";
import AccountIcon from "@/app/layout/AccountIcon";

export default function LoginOptions() {
    const authenticated = true;

    return (
        <>
            {!authenticated && (
                <Link href={"/login"}>
                    <LuLogIn className="w-6 h-6 text-foreground m-2.5" />
                </Link>
            )}
            {authenticated && <AccountIcon />}
        </>
    );
}