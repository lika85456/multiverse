"use client";

import {
    AlertDialog,
    AlertDialogAction,
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
import useModal from "@/features/modals/use-modal";

export default function DeleteConnectionTokenModal() {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const handleDeleteToken = () => {
        console.log("Deleting token");
        handleCloseModal();
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild onClick={handleOpenModal}>
                <TrashIcon className={"w-6 h-6 mx-4 cursor-pointer"} />
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>Delete Token</AlertDialogTitle>
                        <AlertDialogCancel
                            className={"border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"}
                            onClick={handleCloseModal}
                        >
                            <IoClose className={"w-8 h-8"} />
                        </AlertDialogCancel>
                    </div>
                    <AlertDialogDescription className={"text-secondary-foreground"}>
            Do you really wish to delete this token? This action cannot be
            undone and all users using this token will lose access.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={handleCloseModal}
                        className={
                            "flex flex-row w-full justify-center bg-inherit hover:bg-primary "
                        }
                    >
                        <IoClose className={"w-6 h-6"} />
            Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteToken}
                        className={
                            "flex flex-row w-full justify-center bg-destructive text-destructive-foreground hover:bg-destructive_light"
                        }
                    >
                        <TrashIcon className={"w-6 h-6 mx-2"} />
            Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}