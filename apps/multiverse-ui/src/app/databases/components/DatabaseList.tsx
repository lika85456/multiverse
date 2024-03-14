import type { DatabaseItemProps } from "@/app/databases/components/DatabaseItem";
import DatabaseItem from "@/app/databases/components/DatabaseItem";
import CreateDatabaseModal from "@/features/database/CreateDatabaseModal";

export interface DatabaseListProps {
  items: DatabaseItemProps[];
}

export default function DatabaseList({ items }: DatabaseListProps) {
    const databaseItems = items.map((item) => {
        return (
            <li key={item.databaseItem.databaseId}>
                <DatabaseItem databaseItem={item.databaseItem} />
            </li>
        );
    });

    return (
        <>
            <CreateDatabaseModal />
            <ul className={"flex flex-col w-full py-4 space-y-4"}>{databaseItems}</ul>
        </>
    );
}