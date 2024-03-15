"use client";

import { IoAdd, IoClose } from "react-icons/io5";
import { Button } from "@/components/ui/button";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateConnectionTokenModal() {
    const [modalOpen, setModalOpen] = useState(false);
    const [date, setDate] = React.useState<Date>();
    const [tokenName, setTokenName] = useState("");
    const [disabledSubmit, setDisabledSubmit] = useState(true);
    const [focused, setFocused] = useState(false);

    const onConfirmCreate = () => {
        if (true) {
            console.log(`Creating token ${tokenName} with validity ${date}`);
            handleCloseModal();
        } else {
            toast("Token could not be created.");
        }
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

    useEffect(() => {
        date && date > new Date() && tokenName.length > 0
            ? setDisabledSubmit(false)
            : setDisabledSubmit(true);
    }, [tokenName, date]);

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild onClick={handleOpenModal}>
                <Button
                    className={
                        "flex w-fit self-end text-accent-foreground bg-accent hover:bg-accent_light"
                    }
                >
                    <IoAdd className={"w-6 h-6 mr-2"} /> Create token
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>Create Token</AlertDialogTitle>
                        <AlertDialogCancel
                            onClick={handleCloseModal}
                            className={"border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"}
                        >
                            <IoClose className={"w-8 h-8"} />
                        </AlertDialogCancel>
                    </div>
                </AlertDialogHeader>
                <Label>Token name</Label>
                <Input
                    onBlur={() => setFocused(true)}
                    placeholder={"Token name"}
                    onChange={(e) => setTokenName(e.target.value)}
                    className={`bg-inherit hover:bg-primary focus:bg-primary ${
                        focused && tokenName.length === 0 ? "border-destructive" : ""
                    }`}
                />
                <Label>Validity</Label>
                <Popover>
                    <PopoverTrigger>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal bg-inherit hover:bg-primary hover:text-primary-foreground focus:bg-primary",
                                !date && "text-muted-foreground",
                                date &&
                  date < new Date() &&
                  "border-destructive text-destructive",
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-primary w-auto p-0 border-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <AlertDialogFooter>
                    <Button
                        disabled={disabledSubmit}
                        onClick={onConfirmCreate}
                        className={"bg-accent hover:bg-accent_light text-accent-foreground"}
                    >
                        <IoAdd className={"w-6 h-6 mr-2"} />
            Create
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}