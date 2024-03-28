"use client";

import { Button } from "@/components/ui/button";
import { IoAdd, IoClose } from "react-icons/io5";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FaRegCopy } from "react-icons/fa";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import React from "react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import useModal from "@/features/modals/use-modal";

export default function CreateDatabaseModal() {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const handleCreateDatabase = () => {
        console.log("Creating mongodb");
        handleCloseModal();
    };

    const handleCopyRequest = async() => {
        try {
            await navigator.clipboard.writeText(`${"Create mongodb text"}`);
            toast("Data have been copied into your clipboard.");
        } catch (error) {
            console.log("Data could not be copied.");
        }
    };

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger
                asChild
                className="flex w-fit self-end"
                onClick={handleOpenModal}
            >
                <Button className="bg-accent text-accent-foreground hover:bg-accent_light">
                    <IoAdd className="w-8 h-8 mr-2 " />
          Create database
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <AlertDialogHeader>
                    <div className="flex flex-row justify-between">
                        <AlertDialogTitle className="text-xl">
              Create Database
                        </AlertDialogTitle>
                        <AlertDialogCancel
                            onClick={handleCloseModal}
                            className="border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"
                        >
                            <IoClose className="w-8 h-8" />
                        </AlertDialogCancel>
                    </div>
                </AlertDialogHeader>
                <div className="flex flex-col items-start gap-4">
                    <Label htmlFor="dbName" className="text-right">
            Database name
                    </Label>
                    <Input id="dbName" defaultValue="Database1" className="bg-inherit" />
                </div>
                <div className="flex flex-col w-full items-start gap-4">
                    <Label htmlFor="locality" className="text-right">
            Locality
                    </Label>
                    <Select>
                        <SelectTrigger className="w-full bg-inherit">
                            <SelectValue placeholder="Select a locality" />
                        </SelectTrigger>
                        <SelectContent className="bg-card text-secondary-foreground border">
                            <SelectItem
                                className="focus:bg-accent_light"
                                value="central_europe"
                            >
                Central Europe
                            </SelectItem>
                            <SelectItem
                                className="focus:bg-accent_light"
                                value="northern_europe"
                            >
                Northern Europe
                            </SelectItem>
                            <SelectItem
                                className="focus:bg-accent_light"
                                value="eastern_europe"
                            >
                Eastern Europe
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-row w-full space-x-4">
                    <div className="flex flex-col w-full items-start gap-4">
                        <Label htmlFor="locality" className="text-right">
              Metrics
                        </Label>
                        <Select>
                            <SelectTrigger className="w-[280px] bg-inherit">
                                <SelectValue placeholder="Select used metrics" />
                            </SelectTrigger>
                            <SelectContent className="bg-card text-secondary-foreground border">
                                <SelectItem
                                    className="focus:bg-accent_light"
                                    value="dot_product"
                                >
                  Dot Product
                                </SelectItem>
                                <SelectItem className="focus:bg-accent_light" value="euclidean">
                  Euclidean Distance
                                </SelectItem>
                                <SelectItem className="focus:bg-accent_light" value="cosine">
                  Cosine Similarity
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col w-full items-start gap-4">
                        <Label htmlFor="dimensions" className="text-right">
              Dimensions
                        </Label>
                        <Input
                            id="dimensions"
                            defaultValue="1536"
                            type={"number"}
                            className="bg-inherit"
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <Button
                        className="flex w-fit border border-border bg-inherit hover:bg-primary"
                        onClick={handleCopyRequest}
                    >
                        <FaRegCopy className="w-6 h-6 mr-2" />
            Copy request
                    </Button>
                    <Button
                        className="flex w-fit text-accent-foreground bg-accent hover:bg-accent_light"
                        onClick={handleCreateDatabase}
                    >
                        <IoAdd className="w-8 h-8 mr-2" />
            Create
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}