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

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useModal from "@/features/modal/use-modal";
import { trpc } from "@/lib/trpc/client";
import { UTCDate } from "@date-fns/utc";
import { customToast } from "@/features/fetching/CustomToast";
import Spinner from "@/features/fetching/Spinner";
import log from "@multiverse/log";

export default function CreateConnectionTokenModal({ codeName }: {codeName: string}) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();
    const [date, setDate] = React.useState<Date>();
    const [tokenName, setTokenName] = useState("");
    const [focused, setFocused] = useState(false);
    const disabledSubmit = (date && date <= new Date()) || tokenName.length < 4;
    const [isProcessing, setIsProcessing] = useState(false);

    //TODO - fix chosen date
    const mutation = trpc.database.secretToken.post.useMutation({
        onSuccess: async() => {
            await util.database.invalidate();
            handleCloseModal();
            setIsProcessing(false);
            // customToast("Token created");
        },
        onError: () => {
            customToast.error("An error occurred while creating the token.");
            setIsProcessing(false);
        }
    });
    const util = trpc.useUtils();
    const onConfirmCreate = async() => {
        setIsProcessing(true);
        log.debug(date);
        await mutation.mutateAsync({
            codeName: codeName,
            secretToken: {
                name: tokenName,
                validUntil: date ? date.getTime() : 8.64e15, // maximum date
            }
        });
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger asChild onClick={handleOpenModal}>
                <Button className="flex w-fit self-end text-accent-foreground bg-accent hover:bg-accent_light">
                    <IoAdd className="w-6 h-6 mr-2" /> Create token
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle>Create Token</AlertDialogTitle>
                        <AlertDialogCancel
                            onClick={handleCloseModal}
                            className="border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"
                        >
                            <IoClose className="w-8 h-8" />
                        </AlertDialogCancel>
                    </div>
                </AlertDialogHeader>
                <Label>Token name</Label>
                <Input
                    onBlur={() => setFocused(true)}
                    placeholder={"Token name"}
                    onChange={(e) => setTokenName(e.target.value)}
                    className={`bg-inherit hover:bg-primary focus:bg-primary ${
                        focused && tokenName.length < 4 ? "border-destructive" : ""
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
                  date < new UTCDate() &&
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
                            onSelect={(d) => setDate(d)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <AlertDialogFooter>
                    <Button
                        disabled={disabledSubmit || isProcessing}
                        onClick={onConfirmCreate}
                        className="bg-accent hover:bg-accent_light text-accent-foreground"
                    >
                        {!isProcessing && <IoAdd className="w-6 h-6 mr-2" />}
                        {isProcessing && <div className="mr-2">
                            <Spinner />
                        </div>}
            Create
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}