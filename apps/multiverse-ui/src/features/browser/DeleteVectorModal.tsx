import {
    AlertDialog,
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
import useModal from "@/features/modals/use-modal";

export default function DeleteVectorModal({ id }: { id: string }) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const handleCopyRequest = () => {
        navigator.clipboard
            .writeText(`{"id": "${id}"}`)
            .then(() => {
                toast("Request has been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Request could not be copied.");
            });
    };

    const handleDeleteVector = () => {
        console.log(`Deleting vector with id: ${id}`);
        handleCloseModal();
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                <TrashIcon
                    className={"w-6 h-6 cursor-pointer ml-4"}
                    onClick={handleOpenModal}
                />
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Vector</AlertDialogTitle>
                    <AlertDialogDescription>
            Do you really wish to delete this vector? This action cannot be
            undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button
                        className={
                            "flex w-full border-0 bg-inherit hover:bg-secondary text-primary-foreground"
                        }
                        onClick={handleCloseModal}
                    >
                        <TrashIcon className={"w-6 h-6 mr-2"} />
            Cancel
                    </Button>
                    <Button
                        className={
                            "flex w-full border border-border bg-inherit hover:bg-secondary text-primary-foreground"
                        }
                        onClick={handleCopyRequest}
                    >
                        <CopyIcon className={"w-6 h-6 mr-2"} />
            Copy request
                    </Button>
                    <Button
                        className={
                            "flex w-full bg-destructive hover:bg-destructive_light text-destructive-foreground"
                        }
                        onClick={handleDeleteVector}
                    >
                        <TrashIcon className={"w-6 h-6 mr-2"} />
            Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}