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
import { CopyIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import useModal from "@/features/modal/use-modal";
import { IoClose } from "react-icons/io5";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { customToast } from "@/features/fetching/CustomToast";
import Spinner from "@/features/fetching/Spinner";

export default function DeleteVectorModal({
    label, codeName, markAsDeleted
}: { label: string, codeName: string, markAsDeleted: () => void}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const mutation = trpc.database.vector.delete.useMutation({
        onSuccess: async() => {
            // customToast.success("Vector deleted successfully.");
            markAsDeleted();
            handleProcessingEnd();
            handleCloseModal();
        },
        onError: async(error) => {
            if (error.data?.code === "NOT_FOUND") {
                customToast.error("Vector not found.");
            } else {
                customToast.error("An error occurred while deleting the vector.");
            }
            handleProcessingEnd();
        }
    });

    const handleCopyRequest = async() => {
        try {
            await navigator.clipboard.writeText(`{"id": "${label}"}`);
            customToast("Request has been copied into your clipboard.");
        } catch (error) {
            customToast.error("Request could not be copied.");
        }
    };

    const handleDeleteVector = async() => {
        handleProcessingStart();
        await mutation.mutateAsync({
            label: label,
            database: codeName
        });

        console.log(`Deleting vector with label: ${label}`);
    };

    const handleProcessingStart = () => {
        setIsProcessing(true);
    };

    const handleProcessingEnd = () => {
        setIsProcessing(false);
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                <TrashIcon
                    className="w-6 h-6 cursor-pointer ml-4"
                    onClick={handleOpenModal}
                />
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle>Delete Vector</AlertDialogTitle>
                        <AlertDialogCancel
                            onClick={handleCloseModal}
                            className="border-0 bg-inherit hover:bg-inherit hover:text-secondary-foreground w-8 h-8 p-0 m-0"
                        >
                            <IoClose className="w-8 h-8" />
                        </AlertDialogCancel>
                    </div>
                    <AlertDialogDescription>
            Do you really wish to delete this vector? This action cannot be
            undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button
                        className="flex w-full border-0 bg-inherit hover:bg-primary text-primary-foreground"
                        onClick={handleCloseModal}
                    >
            Cancel
                    </Button>
                    <Button
                        className="flex w-full border border-border bg-inherit hover:bg-primary text-primary-foreground"
                        onClick={handleCopyRequest}
                    >
                        <CopyIcon className="w-6 h-6 mr-2" />
            Copy request
                    </Button>
                    <Button
                        className="flex w-full bg-destructive hover:bg-destructive_light text-destructive-foreground"
                        onClick={handleDeleteVector}
                        disabled={isProcessing}
                    >
                        {!isProcessing && <TrashIcon className="w-6 h-6 mr-2" />}
                        {isProcessing && <div className="mr-2">
                            <Spinner />
                        </div>}
            Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}