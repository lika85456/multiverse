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
                name: "Production chatbot 1",
                codename: "prod1_eu_central_af2e8",
                records: 2500000,
                dimensions: 1536,
                metrics: "Dot Product",
            },
        },
        {
            databaseItem: {
                databaseId: "2",
                name: "test 1",
                codename: "test1_eu_central_af2e7",
                records: 317,
                dimensions: 1536,
                metrics: "Euclidean Distance",
            },
        },
        {
            databaseItem: {
                databaseId: "3",
                name: "test 2",
                codename: "test2_eu_central_af2e6",
                records: 5300000,
                dimensions: 3072,
                metrics: "Cosine Similarity",
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