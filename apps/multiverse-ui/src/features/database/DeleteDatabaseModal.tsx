"use client";

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TrashIcon } from "lucide-react";
import { IoClose } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from "next/navigation";
import useModal from "@/features/hooks/use-modal";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { TailSpin } from "react-loader-spinner";

export default function DeleteDatabaseModal() {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();
    const codeName = useParams().codeName as string;
    const [typedDatabaseName, setTypedDatabaseName] = useState("");
    const mutation = trpc.database.delete.useMutation();
    const utils = trpc.useUtils();

    const handleDeleteDatabase = async() => {
        // TODO - takes too long, close and display deleting state or loading spinner
        setIsProcessing(true);
        await mutation.mutateAsync(codeName);
        await utils.database.list.invalidate();
        handleCloseModal();
        setIsProcessing(false);
        router.push("/databases");
        toast.success("Database deleted successfully");
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    className="flex w-fit self-end text-destructive-foreground bg-destructive hover:bg-destructive_light"
                    onClick={handleOpenModal}
                >
                    <TrashIcon className="w-6 h-6 mr-2" />
          Delete database
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle>Delete Database</AlertDialogTitle>
                        <div
                            className="border-0 text-primary-foreground hover:text-secondary-foreground w-8 h-8 p-0 m-0 cursor-pointer transition-all"
                            onClick={handleCloseModal}
                        >
                            <IoClose className="w-8 h-8" />
                        </div>
                    </div>
                    <AlertDialogDescription className="text-secondary-foreground">
            Do you really wish to delete this database? This action cannot be
            undone. To delete this database, type{" "}
                        <span className="text-destructive font-bold tracking-wide">
              “{codeName}”
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    id={"typedDatabaseName"}
                    placeholder={"Database name"}
                    onChange={(e) => setTypedDatabaseName(e.target.value)}
                    className={`bg-inherit ${
                        typedDatabaseName !== codeName
                            ? "border-destructive text-destructive"
                            : "text-primary-foreground"
                    }`}
                />
                <AlertDialogFooter>
                    <Button
                        disabled={typedDatabaseName !== codeName || isProcessing}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive_light disabled:cursor-not-allowed"
                        onClick={handleDeleteDatabase}
                    >

                        {!isProcessing && <TrashIcon className="w-6 h-6 mr-2" />}
                        {isProcessing && <div className="mr-2">
                            <TailSpin
                                visible={true}
                                height="24"
                                width="24"
                                color="#fff"
                                ariaLabel="tail-spin-loading"
                                radius="1"
                                wrapperStyle={{}}
                                wrapperClass=""
                            />
                        </div>}
            Delete database
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}