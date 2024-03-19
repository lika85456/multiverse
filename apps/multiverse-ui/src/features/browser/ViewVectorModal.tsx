import type { Vector } from "@/features/browser/UpsertVectorModal";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import useModal from "@/features/modals/use-modal";
import { CgDetailsMore } from "react-icons/cg";
import Editor from "@monaco-editor/react";
import { IoClose } from "react-icons/io5";
import React from "react";

export default function ViewVectorModal({ vector }: { vector: Vector }) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const vectorData = {
        id: vector.id,
        label: vector.label,
        metadata: vector.metadata,
        values: vector.values,
    };

    const handleCopyData = () => {
        navigator.clipboard
            .writeText(`${JSON.stringify(vector)}`)
            .then(() => {
                toast("Vector has been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Request could not be copied.");
            });
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                <CgDetailsMore
                    className={"w-6 h-6 cursor-pointer ml-4"}
                    onClick={handleOpenModal}
                />
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>View Vector</AlertDialogTitle>
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
                <div className={"p-1 border-2 rounded-sm border-primary"}>
                    <Editor
                        height="30vh"
                        defaultLanguage="json"
                        defaultValue={JSON.stringify(vectorData, null, 2)}
                        theme={"vs-dark"}
                    />
                </div>
                <AlertDialogFooter>
                    <Button
                        className={
                            "flex w-full border-0 bg-inherit hover:bg-primary text-primary-foreground"
                        }
                        onClick={handleCloseModal}
                    >
            Cancel
                    </Button>
                    <Button
                        className={
                            "flex w-full border border-border bg-inherit hover:bg-primary text-primary-foreground"
                        }
                        onClick={handleCopyData}
                    >
                        <CopyIcon className={"w-6 h-6 mr-2"} />
            Copy data
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}