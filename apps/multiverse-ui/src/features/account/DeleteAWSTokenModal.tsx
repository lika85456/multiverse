"use client";

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { TrashIcon } from "lucide-react";
import useModal from "@/features/modal/use-modal";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import Spinner from "@/features/fetching/Spinner";
import { customToast } from "@/features/fetching/CustomToast";

export function DeleteAWSTokenModal({ accessKeyId }: {accessKeyId: string}) {
    const utils = trpc.useUtils();
    const [typedToken, setTypedToken] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const mutation = trpc.awsToken.delete.useMutation({
        onSuccess: async() => {
            await utils.awsToken.get.invalidate();
            handleCloseModal();
            setIsProcessing(false);
        },
        onError: async() => {
            customToast.error("Error removing AWS Token");
            setIsProcessing(false);
        }
    });
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const onConfirmDelete = async() => {
        setIsProcessing(true);
        await mutation.mutateAsync();
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
            databases. All the data will be cleaned and lost. To confirm deletion, type{" "}
                        <span className="text-destructive font-bold tracking-wide">
              “{accessKeyId}”
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    id={"typedToken"}
                    placeholder={"Access Key Id"}
                    onChange={(e) => setTypedToken(e.target.value)}
                    className={`bg-inherit ${
                        typedToken !== accessKeyId
                            ? "border-destructive text-destructive"
                            : "text-primary-foreground"
                    }`}
                />
                <div className="flex flex-row space-x-4">
                    <Button
                        className="flex w-full bg-inherit hover:bg-primary"
                        onClick={handleCloseModal}
                    >
                        <IoClose className="w-6 h-6 mr-2" />
            Cancel
                    </Button>
                    <Button
                        disabled={typedToken !== accessKeyId || isProcessing}
                        className="flex w-full text-destructive-foreground bg-destructive hover:bg-destructive_light"
                        onClick={onConfirmDelete}
                    >
                        {!isProcessing && <TrashIcon className="w-6 h-6 mr-2" />}
                        {isProcessing && <div className="mr-2">
                            <Spinner/>
                        </div>}
            Delete
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}