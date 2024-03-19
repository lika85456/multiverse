"use client";

import { IoAdd } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import useModal from "@/features/modals/use-modal";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { VectorValues } from "@/features/browser/QueryHeader";
import Editor from "@monaco-editor/react";

export interface Vector {
  id?: string;
  label: string;
  metadata?: string;
  value: VectorValues;
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
        value: Array(dimensions).fill(0),
    };

    const [allowActions, setAllowActions] = useState<boolean>(true);
    const [error, setError] = useState<string | undefined>();
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
        console.log(`Upserting vector with label: ${newVector.label}`);
        handleCloseModal();
    };

    const validateJson = (value: string | undefined,): { success: boolean; error: string[] } => {
        if (!value) {
            return {
                success: false,
                error: ["No value"],
            };
        }
        try {
            const json = JSON.parse(value);
            if (!json.label) {
                return {
                    success: false,
                    error: ["Missing vector label"],
                };
            } else if (!json.value) {
                return {
                    success: false,
                    error: ["Missing vector values"],
                };
            } else if (json.value.length !== dimensions) {
                return {
                    success: false,
                    error: [
                        `Invalid vector length (${json.value.length} provided, expected ${dimensions})`,
                    ],
                };
            }

            return {
                success: true,
                error: [],
            };
        } catch (e) {
            console.log("invalid json error");

            return {
                success: false,
                error: ["Invalid JSON format, please check your input."],
            };
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        const { success, error } = validateJson(value);
        if (success) {
            setNewVector(JSON.parse(value as string));
            setAllowActions(true);
            setError(undefined);
        } else {
            setError(error.join("\n"));
            setAllowActions(false);
        }
    };

    const handleRandomizeData = () => {
        const newValue: VectorValues = newVector.value.map(() =>
            Number(Math.random().toFixed(3)),);
        setNewVector({
            ...newVector,
            value: newValue,
        });
    };

    useEffect(() => {
        if (modalOpen) {
            setNewVector(defaultVector);
            setError(undefined);
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
                    <AlertDialogTitle>Upsert Vector</AlertDialogTitle>
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
                {error && <div className={"text-destructive"}>{error}</div>}
                {!error && (
                    <div className={"text-secondary-foreground"}>
            Provided vector is valid
                    </div>
                )}
                <AlertDialogFooter>
                    <Button
                        className={
                            "border-0 bg-inherit hover:bg-secondary text-primary-foreground"
                        }
                        onClick={handleRandomizeData}
                    >
            Randomize
                    </Button>
                    <Button
                        disabled={!allowActions}
                        className={
                            "border border-border bg-inherit hover:bg-secondary text-primary-foreground"
                        }
                        onClick={handleCopyRequest}
                    >
                        <CopyIcon className={"w-6 h-6 mr-2"} />
            Copy request
                    </Button>
                    <Button
                        disabled={!allowActions}
                        className={"bg-accent hover:bg-accent_light text-accent-foreground"}
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