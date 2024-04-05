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
import { trpc } from "@/lib/trpc/client";
import { notFound, useParams } from "next/navigation";

export default function VectorQuery() {
    const codeName = useParams().codeName as string;
    const [queryRan, setQueryRan] = useState<boolean>(false);
    const [results, setResults] = useState<QueryResultProps[]>([]);

    const { data: database, isSuccess } = trpc.database.get.useQuery(codeName);
    const query = trpc.database.vector.query.useMutation();

    const handleRunQuery = async(vector: VectorValues, k: number) => {
        const result = await query.mutateAsync({
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
                vector: vector.vector || [],
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

    if (!database && isSuccess) {
        return notFound();
    }

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

            {queryRan && results.length === 0 && database && (
                <div className="flex flex-col justify-between items-center py-8 space-y-4 text-secondary-foreground">
                    <div>Query result is empty</div>
                    <UpsertVectorModal />
                </div>
            )}
            {queryRan && results.length > 0 && database && (
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
                                    <QueryResult key={result.label} vector={result} codeName={codeName} />
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