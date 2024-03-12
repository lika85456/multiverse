import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import { Separator } from "@/components/ui/separator";
import type { DatabaseListProps } from "@/app/databases/components/DatabaseList";
import DatabaseList from "@/app/databases/components/DatabaseList";
import format from "@/features/statistics/format";

const items = [
    {
        label: "Total Cost",
        value: `$ ${format(12.47)}`,
    },
    {
        label: "Data Size",
        value: `${format(2300000000, "bytes")}`,
    },
    {
        label: "Total Records",
        value: `${format(2537291)}`,
    },
    {
        label: "Queries",
        value: `${format(627000, "compact")}`,
    },
];

const databaseItems: DatabaseListProps = {
    items: [
        {
            databaseItem: {
                databaseId: "1",
                databaseName: "Production chatbot 1",
                databaseCodename: "prod1_eu_central_af2e8",
                databaseRecords: 2500000,
                databaseDimensions: 1536,
                databaseType: "Dot Product",
            },
        },
        {
            databaseItem: {
                databaseId: "2",
                databaseName: "test 1",
                databaseCodename: "test1_eu_central_af2e7",
                databaseRecords: 317,
                databaseDimensions: 1536,
                databaseType: "Euclidean Distance",
            },
        },
        {
            databaseItem: {
                databaseId: "3",
                databaseName: "test 2",
                databaseCodename: "test2_eu_central_af2e6",
                databaseRecords: 5300000,
                databaseDimensions: 3072,
                databaseType: "Cosine Similarity",
            },
        },
    ],
};

export default function Databases() {
    return (
        <>
            <GeneralStatistics items={items} />
            <Separator className={"bg-border m-4"} />
            <DatabaseList items={databaseItems.items} />
        </>
    );
}