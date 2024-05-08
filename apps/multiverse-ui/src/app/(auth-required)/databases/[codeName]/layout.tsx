import DatabaseHeader from "@/app/(auth-required)/databases/[codeName]/layout/DatabaseHeader";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { redirect } from "next/navigation";

export default async function DatabaseViewLayout({
    children,
    params,
}: {
  children: ReactNode;
  params: {
    codeName: string;
  };
}) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return null;
    if (!sessionUser.awsToken) {
        redirect("/account");
    }
    if (!sessionUser.databases.includes(params.codeName)) {
        return redirect("/databases");
    }

    return (
        <div className="flex w-full flex-col">
            <DatabaseHeader databaseCodeName={params.codeName}>
                {children}
            </DatabaseHeader>
        </div>
    );
}