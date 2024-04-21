import { IoAdd, IoClose } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import useModal from "@/features/hooks/use-modal";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CopyIcon } from "lucide-react";
import React, {
    useCallback, useEffect, useState
} from "react";
import Editor from "@monaco-editor/react";
import { trpc } from "@/lib/trpc/client";
import { notFound, useParams } from "next/navigation";
import type { NewVector } from "@multiverse/multiverse/src/core/Vector";
import { customToast } from "@/features/fetching/CustomToast";
import Spinner from "@/features/fetching/Spinner";

export interface Vector {
  label: string;
  metadata?: Record<string, string>;
  vector: number[];
}

export default function UpsertVectorModal({ className, handleInvalidateResult }: {className?: string, handleInvalidateResult: () => void}) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const [isProcessing, setIsProcessing] = useState(false);

    const codeName = useParams().codeName as string;
    const { data: database, isSuccess } = trpc.database.get.useQuery(codeName);
    const mutation = trpc.database.vector.post.useMutation({
        onSuccess: () => {
            // customToast.success("Vector added successfully.");
            handleInvalidateResult();
            handleCloseModal();
            setIsProcessing(false);
        },
        onError: () => {
            customToast.error("An error occurred while adding the vector.");
            setIsProcessing(false);
        }
    });

    const dimensions = database?.database?.dimensions;
    const defaultVector = useCallback(() => {
        const vector: Vector = {
            label: "red tractor",
            metadata: undefined,
            vector: Array(dimensions).fill(0),
        };

        return vector;
    }, [dimensions]);

    const [allowActions, setAllowActions] = useState<boolean>(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [newVector, setNewVector] = useState<Vector>(defaultVector);

    const handleCopyRequest = async() => {
        try {
            await navigator.clipboard.writeText(`${JSON.stringify(newVector)}`);
            customToast("Request has been copied into your clipboard.");
        } catch (error) {
            customToast.error("Request could not be copied.");
        }
    };

    const handleUpsertVector = async() => {
        setIsProcessing(true);
        const newVectors: NewVector[] = [newVector];
        await mutation.mutateAsync({
            database: codeName,
            vector: newVectors
        });
    };

    const findExcessJsonKeys = (json: any): string[] => {
        const requiredKeys = ["label", "vector", "metadata"];
        const excessKeys: string[] = [];
        for (const [key] of Object.entries(json)) {
            if (!requiredKeys.includes(key)) {
                excessKeys.push(`${key}`);
            }
        }

        return excessKeys;
    };

    const transformJsonToVector = (value: string | undefined,): { foundErrors: string[]; vector?: Vector } => {
        try {
            if (!value) {
                return { foundErrors: ["No value"] };
            }
            const foundErrors: string[] = [];
            const json = JSON.parse(value);

            if (!json.label) {
                foundErrors.push("Missing vector label");
            }
            if (!json.vector) {
                foundErrors.push("Missing vector data");
            }
            if (json.vector.length !== dimensions) {
                foundErrors.push(`Invalid vector length (${json.vector.length} provided, expected ${dimensions})`,);
            }

            const excessKey = findExcessJsonKeys(json);
            if (excessKey.length > 0) {
                foundErrors.push(`Excess key${
                    excessKey.length === 1 ? "" : "s"
                } found: ${excessKey.join(", ")} `,);
            }

            if (foundErrors.length > 0) {
                return { foundErrors };
            }

            return {
                foundErrors: [],
                vector: json as Vector,
            };
        } catch (error) {
            if (error instanceof SyntaxError) {
                return { foundErrors: ["Invalid JSON format, please check your input."], };
            }

            return {
                foundErrors: [
                    "Required keys are \"label\" and \"vector\", \"metadata\" is optional. Please provide correct values.",
                ],
            };
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        const { foundErrors, vector } = transformJsonToVector(value);
        if (vector) {
            setNewVector(vector);
            setAllowActions(true);
            setErrors(foundErrors);
        } else {
            setErrors(foundErrors);
            setAllowActions(false);
        }
    };

    const handleRandomizeData = () => {
        const newValue: number[] = newVector.vector.map(() =>
            Number(Math.random().toFixed(3)),);
        setNewVector({
            ...newVector,
            vector: newValue,
        });
    };

    useEffect(() => {
        if (modalOpen) {
            setNewVector(defaultVector);
            setErrors([]);
            setAllowActions(true);
        }
    }, [defaultVector, modalOpen]);

    if (isSuccess && (!database || !database.database)) {
        return notFound();
    }

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                <div className={className} onClick={handleOpenModal}>
                    <Button className="self-end bg-accent text-accent-foreground hover:bg-accent_light">
                        <IoAdd className="w-6 h-6 mr-2" />
            Upsert
                    </Button>
                </div>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle>Upsert Vector</AlertDialogTitle>
                        <AlertDialogCancel
                            onClick={handleCloseModal}
                            className="border-0 bg-inherit hover:bg-inherit hover:text-secondary-foreground w-8 h-8 p-0 m-0"
                        >
                            <IoClose className="w-8 h-8" />
                        </AlertDialogCancel>
                    </div>
                </AlertDialogHeader>
                <div
                    className={`p-1 border-2 rounded-sm ${
                        allowActions ? "border-primary" : "border-destructive"
                    }`}
                >
                    <Editor
                        height="30vh"
                        defaultLanguage="json"
                        defaultValue={JSON.stringify(newVector, null, 2)}
                        value={JSON.stringify(newVector, null, 2)}
                        theme={"vs-dark"}
                        onChange={handleEditorChange}
                    />
                </div>

                <div>
                    {errors &&
            errors.map((error, index) => (
                <ul key={index} className="text-destructive">
                    {error}
                </ul>
            ))}
                </div>
                {!errors && (
                    <div className="text-secondary-foreground">
            Provided vector is valid
                    </div>
                )}
                <AlertDialogFooter>
                    <Button
                        disabled={!allowActions}
                        className="flex w-full border-0 bg-inherit hover:bg-primary text-primary-foreground"
                        onClick={handleRandomizeData}
                    >
            Randomize
                    </Button>
                    <Button
                        disabled={!allowActions}
                        className="flex w-full border border-border bg-inherit hover:bg-primary text-primary-foreground"
                        onClick={handleCopyRequest}
                    >
                        <CopyIcon className="w-6 h-6 mr-2" />
            Copy request
                    </Button>
                    <Button
                        disabled={!allowActions || isProcessing}
                        className="flex w-full bg-accent hover:bg-accent_light text-accent-foreground"
                        onClick={handleUpsertVector}
                    >
                        {!isProcessing && <IoAdd className="w-6 h-6 mr-2" />}
                        {isProcessing && <div className="mr-2">
                            <Spinner />
                        </div>}
            Upsert
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}