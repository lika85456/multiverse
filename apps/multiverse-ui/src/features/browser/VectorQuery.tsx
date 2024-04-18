"use client";

import type { VectorValues } from "@/features/browser/QueryHeader";
import QueryHeader from "@/features/browser/QueryHeader";
import type { QueryResultProps } from "@/features/browser/QueryResult";
import QueryResult from "@/features/browser/QueryResult";
import { useState } from "react";
import UpsertVectorModal from "@/features/browser/UpsertVectorModal";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import {
    notFound, redirect, useParams
} from "next/navigation";
import { customToast } from "@/features/fetching/CustomToast";
import { IoIosWarning } from "react-icons/io";
import Loading from "@/features/fetching/Loading";

export default function VectorQuery() {
    const codeName = useParams().codeName as string;
    const [queryState, setQueryState] = useState<"not-ran"| "running" | "ran" | "error">("not-ran");
    const [results, setResults] = useState<QueryResultProps[]>([]);

    const [isDataCurrent, setIsDataCurrent] = useState<boolean>(false);
    const [deletedResults, setDeletedResults] = useState<string[]>([]);

    const { data: database, isSuccess } = trpc.database.get.useQuery(codeName);
    const query = trpc.database.vector.query.useMutation({
        onSuccess: (results) => {
            setResults(results.result.map((vector): QueryResultProps => {
                return {
                    label: vector.label,
                    metadata: vector.metadata,
                    vector: vector.vector || [],
                    resultDistance: vector.distance,
                };
            }));
            setIsDataCurrent(true);
            setQueryState("ran");
            setDeletedResults([]);
        },
        onError: (error) => {
            if (error.data?.code === "NOT_FOUND") {
                customToast.error("Database not found.");
            } else if (error.data?.code === "UNAUTHORIZED") {
                customToast.error("You are not authenticated.");

                return redirect("/login");
            } else if (error.data?.code === "FORBIDDEN") {
                customToast.error("You are not authorized to access this database.");
            } else {
                customToast.error("An error occurred while running the query.");
            }
            setIsDataCurrent(false);
            setQueryState("error");
        }
    });

    const handleRunQuery = async(vector: VectorValues, k: number) => {
        setQueryState("running");
        setResults([]);
        await query.mutateAsync({
            database: codeName,
            vector: vector,
            k: k,
        });
    };

    const handleDeleteResult = (label: string) => {
        setDeletedResults([...deletedResults, label]);
        setIsDataCurrent(false);
    };

    const handleUpsertVector = () => {
        setIsDataCurrent(false);
    };

    const handleCopyRequest = async(vector: VectorValues, k: number) => {
        try {
            await navigator.clipboard.writeText(`{"vector": [${vector.join(",")}],\n"k": ${k}}`,);
            customToast("Data have been copied into your clipboard.");
        } catch (error) {
            customToast.error("Data could not be copied.");
        }
    };

    const handleCopyResult = async() => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(results.filter((res) => !deletedResults.includes(res.label))));
            customToast("Resulting vectors have been copied into your clipboard.");
        } catch {
            customToast.error("Data could not be copied.");
        }
    };

    if (!database && isSuccess) {
        return notFound();
    }

    return (
        <div className="flex flex-col w-full pb-16">
            <UpsertVectorModal className="self-end py-4" handleInvalidateResult={handleUpsertVector} />
            <QueryHeader
                dimensions={10}
                onRunQuery={handleRunQuery}
                onCopyRequest={handleCopyRequest}
            />
            {queryState === "not-ran" && (
                <div className="flex w-full py-8 justify-center text-secondary-foreground">
          Run a query to display vectors
                </div>
            )}

            {queryState === "ran" && results.length === 0 && database && (
                <div className="flex flex-col justify-between items-center py-8 space-y-4 text-secondary-foreground">
                    <div>Query result is empty</div>
                    <UpsertVectorModal handleInvalidateResult={handleUpsertVector}/>
                </div>
            )}
            {queryState === "ran" && !isDataCurrent && (
                <div className="flex w-full py-2 my-2 justify-center text-warning bg-warning/20 rounded-xl">
                    <IoIosWarning className="w-6 h-6 mr-2"/>
            Results are outdated. Please run the query again to refresh the data.
                </div>
            )}
            {queryState === "running" && (
                <Loading/>
            )}
            {queryState && results.length > 0 && database && (
                <div className="flex flex-col pt-4 space-y-4">
                    <ul className="flex flex-row w-full justify-between items-center font-light  text-secondary-foreground tracking-widest">
                        <div className="px-8">Label</div>
                        <div className="px-8">Vector</div>
                        <div className="mr-8 px-8">Result</div>
                    </ul>
                    <ul className="space-y-4">
                        {results.map((result) => {
                            return (
                                <li key={result.label}>
                                    <QueryResult vector={result} codeName={codeName} handleDeleteResult={handleDeleteResult}/>
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