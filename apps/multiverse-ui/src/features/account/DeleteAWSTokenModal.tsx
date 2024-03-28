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
import { Button } from "@/components/ui/button";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { TrashIcon } from "lucide-react";
import useModal from "@/features/modals/use-modal";

export function DeleteAWSTokenModal() {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const onConfirmDelete = () => {
        handleCloseModal();
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger
                asChild
                className="flex w-fit"
                onClick={handleOpenModal}
            >
                <Button className=" bg-destructive text-destructive-foreground hover:bg-destructive_light">
                    <FaRegTrashAlt className="w-6 h-6 mr-2 " />
          Remove token
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle>Delete AWS token</AlertDialogTitle>
                        <IoClose
                            onClick={handleCloseModal}
                            className="w-4 h-4 cursor-pointer hover:text-secondary-foreground transition-all "
                        />
                    </div>
                    <AlertDialogDescription className="text-secondary-foreground">
            Do you really wish to delete this AWS Token? This action cannot be
            undone and Multiverse loses access to related AWS Account and
            databases.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="flex w-full bg-inherit hover:bg-primary">
                        <IoClose className="w-6 h-6 mr-2" />
            Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className="flex w-full text-destructive-foreground bg-destructive hover:bg-destructive_light"
                        onClick={onConfirmDelete}
                    >
                        <TrashIcon className="w-6 h-6 mr-2" />
            Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}