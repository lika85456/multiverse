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
import { toast } from "sonner";
import useModal from "@/features/hooks/use-modal";
import { IoClose } from "react-icons/io5";
import React from "react";
import { trpc } from "@/lib/trpc/client";

export default function DeleteVectorModal({ label, codeName }: { label: string, codeName: string}) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const mutation = trpc.database.vector.delete.useMutation();

    const handleCopyRequest = async() => {
        try {
            await navigator.clipboard.writeText(`{"id": "${label}"}`);
            toast("Request has been copied into your clipboard.");
        } catch (error) {
            console.log("Request could not be copied.");
        }
    };

    const handleDeleteVector = async() => {
        await mutation.mutateAsync({
            label: label,
            database: codeName
        });

        console.log(`Deleting vector with label: ${label}`);
        handleCloseModal();
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
                    >
                        <TrashIcon className="w-6 h-6 mr-2" />
            Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}