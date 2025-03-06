import * as React from "react";
import Spinner from "@/features/fetching/Spinner";

export default function Loading() {

    return (
        <div className="flex w-full justify-center items-center my-4">
            <div className="flex flex-row border border-border space-x-2 rounded-xl p-2">
                <Spinner />
                <div>
            Loading...
                </div>
            </div>
        </div>);
}