import DatabaseHeader from "@/app/(auth-required)/databases/[codeName]/layout/DatabaseHeader";
import type { ReactNode } from "react";

export default function DatabaseViewLayout({
    children,
    params,
}: {
  children: ReactNode;
  params: {
    codeName: string;
  };
}) {
    return (
        <div className="flex w-full flex-col">
            <DatabaseHeader databaseCodeName={params.codeName}>
                {children}
            </DatabaseHeader>
        </div>
    );
}