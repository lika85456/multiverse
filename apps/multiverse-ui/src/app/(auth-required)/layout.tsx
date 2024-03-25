import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function AuthCheck({ children }: { children: ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/login");
    }

    return <>{children}</>;
}