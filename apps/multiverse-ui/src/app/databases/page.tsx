import GeneralStatistics from "@/features/statistics/GeneralStatistics";
import { Button } from "@/components/ui/button";
import { IoAdd } from "react-icons/io5";
import { Separator } from "@/components/ui/separator";
import type { DatabaseListProps } from "@/app/databases/components/DatabaseList";
import DatabaseList from "@/app/databases/components/DatabaseList";

const items = [
    {
        label: "Total Cost",
        value: "12.47",
        unit: {
            sign: "$",
            prepend: true,
        },
    },
    {
        label: "Data Size",
        value: "2.3",
        unit: {
            sign: "GB",
            prepend: false,
        },
    },
    {
        label: "Total Records",
        value: "2 537 291",
        unit: {
            sign: "",
            prepend: false,
        },
    },
    {
        label: "Queries",
        value: "627",
        unit: {
            sign: "K",
            prepend: false,
        },
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