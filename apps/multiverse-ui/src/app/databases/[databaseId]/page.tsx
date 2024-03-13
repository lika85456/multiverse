import DatabaseHeader from "@/app/databases/[databaseId]/layout/DatabaseHeader";
import SectionTitle from "@/app/layout/components/SectionTitle";
import GeneralDatabaseStatistics from "@/features/database/GeneralDatabaseStatistics";
import { Separator } from "@/components/ui/separator";
import ConnectionTokensList from "@/features/database/ConnectionTokensList";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";

export default function DatabaseGeneral() {
    return (
        <div className={"flex flex-col w-full "}>
            <GeneralDatabaseStatistics />
            <Separator className={"my-4"} />
            <ConnectionTokensList />
            <Separator className={"my-4"} />
            <Button
                className={
                    "flex w-fit self-end text-destructive-foreground bg-destructive hover:bg-destructive_light"
                }
            >
                <TrashIcon className={"w-6 h-6 mr-2"} />
        Delete database
            </Button>
        </div>
    );
}