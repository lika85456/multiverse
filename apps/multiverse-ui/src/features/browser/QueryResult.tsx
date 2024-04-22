import DeleteVectorModal from "@/features/browser/DeleteVectorModal";
import ViewVectorModal from "@/features/browser/ViewVectorModal";
import React, { useState } from "react";
import { TrashIcon } from "lucide-react";
import { CgDetailsMore } from "react-icons/cg";

export interface QueryResultProps {
  label: string;
  metadata?: Record<string, string>
  vector: number[];
  resultDistance: number;
}

export default function QueryResult({
    vector, codeName, handleDeleteResult
}: { vector: QueryResultProps, codeName: string, handleDeleteResult: (label: string) => void }) {
    const [isDeleted, setIsDeleted] = useState<boolean>(false);

    const handleMarkAsDeleted = () => {
        handleDeleteResult(vector.label);
        setIsDeleted(true);
    };

    const vectorResultString = vector.resultDistance.toFixed(3);

    const vectorDataString = vector.vector.slice(0, 10)
        .map((element) => `${element.toFixed(3)}`)
        .join(", ").slice(0, 60 - vectorResultString.length);

    return (
        <>
            <div
                className={`flex flex-row w-full h-9 justify-center items-center px-4 border-b ${
                    isDeleted ?
                        "text-destructive_light border-destructive select-none" :
                        "text-primary-foreground border-border hover:bg-secondary"
                } transition-all`}>
                <div className="flex flex-row w-full justify-between items-center">
                    <div className="flex flex-row">
                        <div className="w-32 truncate mr-2">
                            {vector.label}
                        </div>
                        <div className="truncate tracking-tighter font-mono font-thin">{`[ ${vectorDataString}...]`}</div>
                    </div>
                    <div className="flex justify-end w-fit tracking-tighter font-mono font-thin">
                        {`${vectorResultString}`}
                    </div>
                </div>
                {isDeleted && (
                    <>
                        <TrashIcon className="w-6 h-6 ml-4 cursor-not-allowed"/>
                        <CgDetailsMore className="w-6 h-6 ml-4  cursor-not-allowed"/>
                    </>
                )}
                {!isDeleted && (
                    <>
                        <DeleteVectorModal label={vector.label} codeName={codeName} markAsDeleted={handleMarkAsDeleted}/>
                        <ViewVectorModal vector={{ ...vector }} result={vector.resultDistance}/>
                    </>
                )}

            </div>

        </>
    );
}