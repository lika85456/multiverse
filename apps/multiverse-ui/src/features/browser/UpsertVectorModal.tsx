"use client";

import { IoAdd, IoClose } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import useModal from "@/features/modals/use-modal";
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
import { toast } from "sonner";
import React, { useEffect, useState } from "react";
import type { VectorValues } from "@/features/browser/QueryHeader";
import Editor from "@monaco-editor/react";

export interface Vector {
  id?: string;
  label: string;
  metadata?: any;
  values: VectorValues;
}

export interface UpsertVectorModalProps {
  dimensions: number;
  className?: string;
}

export default function UpsertVectorModal({
    className,
    dimensions,
}: UpsertVectorModalProps) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const defaultVector = {
        label: "red tractor",
        metadata: undefined,
        values: Array(dimensions).fill(0),
    };

    const [allowActions, setAllowActions] = useState<boolean>(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [newVector, setNewVector] = useState<Vector>(defaultVector);

    const handleCopyRequest = () => {
        navigator.clipboard
            .writeText(`${JSON.stringify(newVector)}`)
            .then(() => {
                toast("Request has been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Request could not be copied.");
            });
    };

    const handleUpsertVector = () => {
        console.log(`Upserting vector with label: ${JSON.stringify(newVector)}`);
        handleCloseModal();
    };

    const findExcessJsonKeys = (json: any): string[] => {
        console.log(json);
        const requiredKeys = ["label", "values", "metadata"];
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
            if (!json.values) {
                foundErrors.push("Missing vector values");
            }
            if (json.values.length !== dimensions) {
                foundErrors.push(`Invalid vector length (${json.values.length} provided, expected ${dimensions})`,);
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
                    "Required keys are \"label\" and \"values\", \"metadata\" is optional. Please provide correct values.",
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
        const newValue: VectorValues = newVector.values.map(() =>
            Number(Math.random().toFixed(3)),);
        setNewVector({
            ...newVector,
            values: newValue,
        });
    };

    useEffect(() => {
        if (modalOpen) {
            setNewVector(defaultVector);
            setErrors([]);
            setAllowActions(true);
        }
    }, [modalOpen]);

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                <div className={className} onClick={handleOpenModal}>
                    <Button
                        className={
                            "self-end bg-accent text-accent-foreground hover:bg-accent_light"
                        }
                    >
                        <IoAdd className={"w-6 h-6 mr-2"} />
            Upsert
                    </Button>
                </div>
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>Upsert Vector</AlertDialogTitle>
                        <AlertDialogCancel
                            onClick={handleCloseModal}
                            className={
                                "border-0 bg-inherit hover:bg-inherit hover:text-secondary-foreground w-8 h-8 p-0 m-0"
                            }
                        >
                            <IoClose className={"w-8 h-8"} />
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
                <ul key={index} className={"text-destructive"}>
                    {error}
                </ul>
            ))}
                </div>
                {!errors && (
                    <div className={"text-secondary-foreground"}>
            Provided vector is valid
                    </div>
                )}
                <AlertDialogFooter>
                    <Button
                        disabled={!allowActions}
                        className={
                            "flex w-full border-0 bg-inherit hover:bg-primary text-primary-foreground"
                        }
                        onClick={handleRandomizeData}
                    >
            Randomize
                    </Button>
                    <Button
                        disabled={!allowActions}
                        className={
                            "flex w-full border border-border bg-inherit hover:bg-primary text-primary-foreground"
                        }
                        onClick={handleCopyRequest}
                    >
                        <CopyIcon className={"w-6 h-6 mr-2"} />
            Copy request
                    </Button>
                    <Button
                        disabled={!allowActions}
                        className={
                            "flex w-full bg-accent hover:bg-accent_light text-accent-foreground"
                        }
                        onClick={handleUpsertVector}
                    >
                        <IoAdd className={"w-6 h-6 mr-2"} />
            Upsert
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}