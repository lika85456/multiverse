"use client";

import type { VectorValues } from "@/features/browser/QueryHeader";
import QueryHeader from "@/features/browser/QueryHeader";
import type { QueryResultProps } from "@/features/browser/QueryResult";
import QueryResult from "@/features/browser/QueryResult";
import { toast } from "sonner";
import { useState } from "react";
import UpsertVectorModal from "@/features/browser/UpsertVectorModal";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";

const dummyResults = [
    {
        id: "1",
        label: "red tractor",
        value: [
            0.1, 0.2, 0.312, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 0.2, 0.3, 0.312, 0.4,
            0.5, 0.6, 0.7, 0.8, 0.9, 1,
        ],
        metrics: 48.371,
    },
    {
        id: "2",
        label: "blue tractor",
        value: [
            0.1, 0.2, 0.312, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 0.2, 0.3, 0.312, 0.4,
            0.5, 0.6, 0.7, 0.8, 0.9, 1,
        ],
        metrics: 52.371,
    },
    {
        id: "3",
        label: "green tractor",
        value: [
            0.1, 0.2, 0.312, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 0.2, 0.3, 0.312, 0.4,
            0.5, 0.6, 0.7, 0.8, 0.9, 1,
        ],
        metrics: 58.371,
    },
    {
        id: "4",
        label: "yellow tractor",
        value: [
            0.1, 0.2, 0.312, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 0.2, 0.3, 0.312, 0.4,
            0.5, 0.6, 0.7, 0.8, 0.9, 1,
        ],
        metrics: 68.371,
    },
    {
        id: "5",
        label: "purple tractor",
        value: [
            0.1, 0.2, 0.312, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 0.2, 0.3, 0.312, 0.4,
            0.5, 0.6, 0.7, 0.8, 0.9, 1,
        ],
        metrics: 78.371,
    },
];

export default function VectorQuery() {
    const [queryRan, setQueryRan] = useState<boolean>(false);
    const [results, setResults] = useState<QueryResultProps[]>([]);
    const dimensions = 10;

    const handleRunQuery = (vector: VectorValues, k: number) => {
        console.log(`running query ${vector} with k=${k}`);
        setQueryRan(true);
        setResults(dummyResults);
    };

    const handleCopyRequest = async(vector: VectorValues, k: number) => {
        navigator.clipboard
            .writeText(`{"vector": [${vector.join(",")}],\n"k": ${k}}`)
            .then(() => {
                toast("Data have been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Data could not be copied.");
            });
    };

    const handleCopyResult = async() => {
        navigator.clipboard
            .writeText(JSON.stringify(results))
            .then(() => {
                toast("Resulting vectors have been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Data could not be copied.");
            });
    };

    return (
        <div className={"flex flex-col w-full"}>
            <QueryHeader
                dimensions={10}
                runQuery={handleRunQuery}
                copyRequest={handleCopyRequest}
            />
            {!queryRan && (
                <div
                    className={
                        "flex w-full py-8 justify-center text-secondary-foreground"
                    }
                >
          Run a query to display vectors
                </div>
            )}

            {queryRan && results.length === 0 && (
                <div
                    className={
                        "flex flex-col justify-between items-center py-8 space-y-4 text-secondary-foreground"
                    }
                >
                    <div>Query result is empty</div>
                    <UpsertVectorModal dimensions={dimensions} />
                </div>
            )}
            {queryRan && results.length > 0 && (
                <div className={"flex flex-col pt-8 space-y-4"}>
                    <ul
                        className={
                            "flex flex-row w-full justify-between items-center font-light  text-secondary-foreground tracking-widest"
                        }
                    >
                        <div className={"px-8"}>Label</div>
                        <div className={"px-8"}>Vector</div>
                        <div className={"mr-8 px-8"}>Result</div>
                    </ul>
                    <ul className={"space-y-4"}>
                        {results.map((result) => {
                            return (
                                <li>
                                    <QueryResult key={result.id} vector={result} />
                                </li>
                            );
                        })}
                    </ul>
                    <Button
                        className={"self-end hover:text-secondary-foreground"}
                        onClick={handleCopyResult}
                    >
                        <CopyIcon className={"w-6 h-6 mr-2"} />
            Copy result
                    </Button>
                </div>
            )}
        </div>
    );
}