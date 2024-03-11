import { Button } from "@/components/ui/button";
import Link from "next/link";

import { RiDatabase2Line } from "react-icons/ri";

export type DatabaseItemProps = {
  databaseItem: {
    databaseId: string;
    databaseName: string;
    databaseCodename: string;
    databaseRecords: number;
    databaseDimensions: number;
    databaseType: string;
  };
};

export default function DatabaseItem({ databaseItem }: DatabaseItemProps) {
    return (
        <Link
            href={`/databases/${databaseItem.databaseId}`}
            className={
                "flex flex-row w-full p-4 border outline-border rounded-2xl items-center"
            }
        >
            <div className={"flex w-11/12 m-0 p-0"}>
                <div className={"flex flex-col w-6/12"}>
                    <h3 className={"text-2xl font-bold"}>{databaseItem.databaseName}</h3>
                    <p className={"text-xl lowercase text-tertiary"}>
                        {databaseItem.databaseCodename}
                    </p>
                </div>
                <div className={"flex flex-col w-4/12 items-start text-xl"}>
                    <div className={"flex flex-row h-full justify-start"}>
                        <p className={"font-bold mr-2 text-tertiary"}>
                            {databaseItem.databaseRecords}
                        </p>
                        <p className={"text-tertiary"}>records</p>
                    </div>
                    <div className={"flex flex-row "}>
                        <p className={"font-bold mr-2 text-tertiary"}>
                            {databaseItem.databaseDimensions}
                        </p>
                        <p className={"text-tertiary"}>dimensions</p>
                    </div>
                </div>
                <p
                    className={
                        "flex w-4/12 justify-start items-center text-xl text-tertiary"
                    }
                >
                    {databaseItem.databaseType}
                </p>
            </div>
            <Button
                className={
                    "flex w-1/12 bg-inherit text-primary-foreground hover:text-middle "
                }
            >
                <RiDatabase2Line className={"w-10 h-10"} />
            </Button>
        </Link>
    );
}