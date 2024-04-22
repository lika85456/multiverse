import { IoIosWarning } from "react-icons/io";
import type { ReactNode } from "react";

export function Warning({ children }: { children: ReactNode }) {
    return <div className="flex flex-row items-center justify-center w-full bg-warning/30 py-2 my-2 rounded-md space-x-2">
        <IoIosWarning className=" text-warning w-6 h-6 mr-2"/>
        <p className="text-warning ml-2">{children}</p>
        <IoIosWarning className=" text-warning w-6 h-6 ml-2"/>
    </div>;
}