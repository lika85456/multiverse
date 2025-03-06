"use client";

import { LuLogIn } from "react-icons/lu";
import Link from "next/link";
import AccountIcon from "@/app/layout/AccountIcon";

export default function LoginOptions({ user, }: {
  user:
    | {
        name?: string | null | undefined;
        email?: string | null | undefined;
        image?: string | null | undefined;
      }
    | undefined;
}) {
    const authenticated = !!user;

    return (
        <>
            {!authenticated && (
                <Link href={"/login"}>
                    <LuLogIn className="w-6 h-6 text-foreground m-2.5" />
                </Link>
            )}
            {authenticated && <AccountIcon user={user} />}
        </>
    );
}