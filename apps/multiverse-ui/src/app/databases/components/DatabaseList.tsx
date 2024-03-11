import { IoAdd } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import type { DatabaseItemProps } from "@/app/databases/components/DatabaseItem";
import DatabaseItem from "@/app/databases/components/DatabaseItem";

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
            <Button
                className={"self-end bg-accent font-medium hover:bg-accent_light"}
            >
                <IoAdd className={"w-8 h-8 mr-1"} />
        Create database
            </Button>
            <ul className={"flex flex-col w-full py-4 space-y-4"}>{databaseItems}</ul>
        </>
    );
}