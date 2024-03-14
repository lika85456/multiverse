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
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function DeleteDatabaseModal() {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);

    const dbName = "Database Chatbot 1";
    const [typedDatabaseName, setTypedDatabaseName] = useState("");

    const handleDeleteDatabase = () => {
        console.log("Deleting database");
        handleCloseModal();
        router.push("/databases");
    };

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleCloseModal();
            }
        };
        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    className={
                        "flex w-fit self-end text-destructive-foreground bg-destructive hover:bg-destructive_light"
                    }
                    onClick={handleOpenModal}
                >
                    <TrashIcon className={"w-6 h-6 mr-2"} />
          Delete database
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>Delete Database</AlertDialogTitle>
                        <div
                            className={
                                "border-0 text-primary-foreground hover:text-secondary-foreground w-8 h-8 p-0 m-0 cursor-pointer transition-all"
                            }
                            onClick={handleCloseModal}
                        >
                            <IoClose className={"w-8 h-8"} />
                        </div>
                    </div>
                    <AlertDialogDescription className={"text-secondary-foreground"}>
            Do you really wish to delete this database? This action cannot be
            undone. To delete this database, type “{dbName}”
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    id={"typedDatabaseName"}
                    placeholder={"Database name"}
                    onChange={(e) => setTypedDatabaseName(e.target.value)}
                    className={`bg-inherit ${
                        typedDatabaseName !== dbName
                            ? "border-destructive text-destructive"
                            : "text-primary-foreground"
                    }`}
                />
                <AlertDialogFooter>
                    <Button
                        disabled={typedDatabaseName !== dbName}
                        className={
                            "bg-destructive text-destructive-foreground hover:bg-destructive_light disabled:cursor-not-allowed"
                        }
                        onClick={handleDeleteDatabase}
                    >
                        <TrashIcon className={"w-6 h-6 mr-2"} />
            Delete database
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}