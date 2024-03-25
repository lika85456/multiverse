import GeneralDatabaseStatistics from "@/features/statistics/GeneralDatabaseStatistics";
import { Separator } from "@/components/ui/separator";
import ConnectionTokensList from "@/features/connectionToken/ConnectionTokensList";
import DeleteDatabaseModal from "@/features/database/DeleteDatabaseModal";

export default function DatabaseGeneral() {
    return (
        <div className="flex flex-col w-full ">
            <GeneralDatabaseStatistics />
            <Separator className="my-4" />
            <ConnectionTokensList />
            <Separator className="my-4" />
            <DeleteDatabaseModal />
        </div>
    );
}