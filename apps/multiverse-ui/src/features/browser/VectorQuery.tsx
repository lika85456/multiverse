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
import { trpc } from "@/_trpc/client";

export default function VectorQuery() {
    const [queryRan, setQueryRan] = useState<boolean>(false);
    const [results, setResults] = useState<QueryResultProps[]>([]);
    const dimensions = 10;
    const mutation = trpc.runVectorQuery.useMutation();

    const handleRunQuery = async(vector: VectorValues, k: number) => {
        const result = await mutation.mutateAsync({
            database: "database_1",
            vector: vector,
            k: k,
        });
        console.log(result);
        setQueryRan(true);
        setResults(result.result.map((vector): QueryResultProps => {
            return {
                label: vector.label,
                metadata: vector.metadata,
                values: vector.vector || [],
                resultDistance: vector.distance,
            };
        }));
    };

    const handleCopyRequest = async(vector: VectorValues, k: number) => {
        try {
            await navigator.clipboard.writeText(`{"vector": [${vector.join(",")}],\n"k": ${k}}`,);
            toast("Data have been copied into your clipboard.");
        } catch (error) {
            console.log("Data could not be copied.");
        }
    };

    const handleCopyResult = async() => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(results));
            toast("Resulting vectors have been copied into your clipboard.");
        } catch {
            console.log("Data could not be copied.");
        }
    };

    return (
        <div className="flex flex-col w-full">
            <QueryHeader
                dimensions={10}
                onRunQuery={handleRunQuery}
                onCopyRequest={handleCopyRequest}
            />
            {!queryRan && (
                <div className="flex w-full py-8 justify-center text-secondary-foreground">
          Run a query to display vectors
                </div>
            )}

            {queryRan && results.length === 0 && (
                <div className="flex flex-col justify-between items-center py-8 space-y-4 text-secondary-foreground">
                    <div>Query result is empty</div>
                    <UpsertVectorModal dimensions={dimensions} />
                </div>
            )}
            {queryRan && results.length > 0 && (
                <div className="flex flex-col pt-8 space-y-4">
                    <ul className="flex flex-row w-full justify-between items-center font-light  text-secondary-foreground tracking-widest">
                        <div className="px-8">Label</div>
                        <div className="px-8">Vector</div>
                        <div className="mr-8 px-8">Result</div>
                    </ul>
                    <ul className="space-y-4">
                        {results.map((result) => {
                            return (
                                <li>
                                    <QueryResult key={result.label} vector={result} />
                                </li>
                            );
                        })}
                    </ul>
                    <Button
                        className="self-end hover:text-secondary-foreground"
                        onClick={handleCopyResult}
                    >
                        <CopyIcon className="w-6 h-6 mr-2" />
            Copy result
                    </Button>
                </div>
            )}
        </div>
    );
}