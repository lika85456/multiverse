import Link from "next/link";

import { RiDatabase2Line } from "react-icons/ri";
export type DatabaseItemProps = {
  database: {
    codeName: string;
    name: string;
    records: number;
    dimensions: number;
    space: string;
  };
};

export default function DatabaseItem({ database }: DatabaseItemProps) {
    return (
        <Link
            href={`/databases/${database.codeName}`}
            className="flex flex-row w-full p-4 border outline-border rounded-2xl items-center hover:bg-secondary transition-all"
        >
            <div className="flex w-11/12 m-0 p-0">
                <div className="flex flex-col w-6/12">
                    <h3 className="text-2xl font-bold truncate">{database.name}</h3>
                    <p className="text-xl lowercase text-secondary-foreground">{database.codeName}</p>
                </div>
                <div className="flex flex-col w-4/12 items-start text-xl">
                    <div className="flex flex-row h-full justify-start">
                        <p className="font-bold mr-2 text-secondary-foreground">{database.records}</p>
                        <p className="text-secondary-foreground">records</p>
                    </div>
                    <div className="flex flex-row ">
                        <p className="font-bold mr-2 text-secondary-foreground">
                            {database.dimensions}
                        </p>
                        <p className="text-secondary-foreground">dimensions</p>
                    </div>
                </div>
                <p className="flex w-2/12 justify-start items-center text-xl text-secondary-foreground">
                    {database.space}
                </p>
            </div>
            <div className="flex w-1/12 justify-center">
                <RiDatabase2Line className="flex w-10 h-10 text-primary-foreground" />
            </div>
        </Link>
    );
}