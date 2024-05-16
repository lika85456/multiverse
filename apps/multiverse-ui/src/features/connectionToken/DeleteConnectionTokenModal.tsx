"use client";

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
import { TrashIcon } from "lucide-react";
import { IoClose } from "react-icons/io5";
import useModal from "@/features/modal/use-modal";
import type { SecretToken } from "@/server/procedures/database";
import { trpc } from "@/lib/trpc/client";
import { useParams } from "next/navigation";
import { customToast } from "@/features/fetching/CustomToast";
import Spinner from "@/features/fetching/Spinner";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function DeleteConnectionTokenModal({ token }: {token: SecretToken}) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const codeName = useParams().codeName as string;
    const [isProcessing, setIsProcessing] = useState(false);

    const utils = trpc.useUtils();
    const mutation = trpc.database.secretToken.delete.useMutation({
        onSuccess: async() => {
            await utils.database.invalidate();
            // customToast.success("Token deleted");
            handleCloseModal();
            setIsProcessing(false);
        },
        onError: () => {
            customToast.error("An error occurred while deleting the token.");
            setIsProcessing(false);
        }
    });

    const handleDeleteToken = async() => {
        setIsProcessing(true);
        await mutation.mutateAsync({
            codeName: codeName,
            tokenName: token.name,
        });
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild onClick={handleOpenModal}>
                <TrashIcon className="w-6 h-6 mx-4 cursor-pointer" />
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle>Delete Token</AlertDialogTitle>
                        <AlertDialogCancel
                            className="border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"
                            onClick={handleCloseModal}
                        >
                            <IoClose className="w-8 h-8" />
                        </AlertDialogCancel>
                    </div>
                    <AlertDialogDescription className="text-secondary-foreground">
            Do you really wish to delete this token? This action cannot be
            undone and all users using this token will lose access.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <Button
                        onClick={handleCloseModal}
                        className="flex flex-row w-full justify-center bg-inherit hover:bg-primary "
                    >
                        <IoClose className="w-6 h-6" />
            Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteToken}
                        className="flex flex-row w-full justify-center bg-destructive text-destructive-foreground hover:bg-destructive_light"
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