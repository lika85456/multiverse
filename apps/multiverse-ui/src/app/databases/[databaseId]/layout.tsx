import DatabaseHeader from "@/app/databases/[databaseId]/layout/DatabaseHeader";

export default function DatabaseViewLayout({
    children,
    params,
}: {
  children: React.ReactNode;
  params: {
    databaseId: string;
  };
}) {
    return (
        <div className="flex w-full flex-col">
            <DatabaseHeader databaseId={params.databaseId} />
            {children}
        </div>
    );
}