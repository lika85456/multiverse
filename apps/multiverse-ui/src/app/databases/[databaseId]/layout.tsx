import DatabaseHeader from "@/app/databases/[databaseId]/layout/DatabaseHeader";

export default function DatabaseViewLayout({ children, }: Readonly<{
  children: React.ReactNode;
}>) {
    return (
        <div className={"flex w-full flex-col"}>
            <DatabaseHeader />
            {children}
        </div>
    );
}