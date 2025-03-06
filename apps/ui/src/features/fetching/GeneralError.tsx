import * as React from "react";
import { MdError } from "react-icons/md";

export default function GeneralError() {
    return <div className="flex w-full justify-center items-center my-4">
        <div className="flex flex-row bg-destructive space-x-2  rounded-xl p-2">
            <MdError className="w-6 h-6 text-primary" />
            <div className="text-primary">
                Error
            </div>
        </div>

    </div>;
}