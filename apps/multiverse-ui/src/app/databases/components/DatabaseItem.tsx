import { Button } from "@/components/ui/button";
import Link from "next/link";

import { RiDatabase2Line } from "react-icons/ri";

export type DatabaseItemProps = {
  databaseItem: {
    databaseId: string;
    name: string;
    codename: string;
    records: number;
    dimensions: number;
    metrics: string;
  };
};

export default function DatabaseItem({ databaseItem }: DatabaseItemProps) {
    return (
        <Link
            href={`/databases/${databaseItem.databaseId}`}
            className={
                "flex flex-row w-full p-4 border outline-border rounded-2xl items-center hover:bg-secondary transition-all"
            }
        >
            <div className={"flex w-11/12 m-0 p-0"}>
                <div className={"flex flex-col w-6/12"}>
                    <h3 className={"text-2xl font-bold"}>{databaseItem.name}</h3>
                    <p className={"text-xl lowercase text-tertiary"}>
                        {databaseItem.codename}
                    </p>
                </div>
                <div className={"flex flex-col w-4/12 items-start text-xl"}>
                    <div className={"flex flex-row h-full justify-start"}>
                        <p className={"font-bold mr-2 text-tertiary"}>
                            {databaseItem.records}
                        </p>
                        <p className={"text-tertiary"}>records</p>
                    </div>
                    <div className={"flex flex-row "}>
                        <p className={"font-bold mr-2 text-tertiary"}>
                            {databaseItem.dimensions}
                        </p>
                        <p className={"text-tertiary"}>dimensions</p>
                    </div>
                </div>
                <p
                    className={
                        "flex w-4/12 justify-start items-center text-xl text-tertiary"
                    }
                >
                    {databaseItem.metrics}
                </p>
            </div>
            <div className={"flex w-1/12 justify-center"}>
                <RiDatabase2Line className={"flex w-10 h-10 text-primary-foreground"} />
            </div>
        </Link>
    );
}