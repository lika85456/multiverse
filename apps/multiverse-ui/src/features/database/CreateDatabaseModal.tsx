"use client";

import { Button } from "@/components/ui/button";
import { IoAdd, IoClose } from "react-icons/io5";
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
import useModal from "@/features/modal/use-modal";
import { trpc } from "@/lib/trpc/client";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { customToast } from "@/features/fetching/CustomToast";
import log from "@multiverse/log";
import sleep from "@/lib/sleep";

const Regions = [{
    code: "eu-central-1",
    name: "Central Europe",
}];

//"l2" | "cosine" | "ip"
const Spaces = [
    {
        code: "l2",
        name: "L2",
    },
    {
        code: "cosine",
        name: "Cosine Similarity",
    },
    {
        code: "ip",
        name: "IP",
    },
];

const DatabaseFormSchema = z.object({
    name: z.string().min(4).max(64),
    region: z.string().refine((value) => {
        return Regions.some((region) => region.code === value);
    }, { message: "Invalid region" }),
    space: z.string().refine((value) => {
        return Spaces.some((space) => space.code === value);
    }, { message: "Invalid space" }),
    dimensions: z.coerce.number().min(1),
});

export default function CreateDatabaseModal() {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const util = trpc.useUtils();
    const mutation = trpc.database.post.useMutation({
        onSuccess: async() => {
            try {
                await util.database.invalidate();
                customToast("Database created");
            } catch (error) {
                customToast.error("Error creating database");
            }
        }
    });

    const form = useForm<z.infer<typeof DatabaseFormSchema>>({
        resolver: zodResolver(DatabaseFormSchema),
        defaultValues: {
            name: "",
            region: "",
            space: "",
            dimensions: 1536,
        }
    });

    async function onSubmit(values: z.infer<typeof DatabaseFormSchema>) {
        // invalidate the database route after 200ms
        sleep(400).then(async() => {
            handleCloseModal();
            form.reset();
            await util.database.list.invalidate();
            log.debug("TRPC database route invalidated");
        });

        await mutation.mutateAsync({
            name: values.name,
            region: values.region,
            space: values.space,
            dimensions: values.dimensions,
            secretTokens: [],
        });

    }

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
                <Form {...form}>
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

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (

                                <FormItem className="flex flex-col items-start">
                                    <FormLabel>Database name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Database Name" {...field} className="bg-inherit" />
                                    </FormControl>
                                    <FormMessage className="py-0"/>
                                </FormItem>

                            )}
                        />

                        <FormField
                            control={form.control}
                            name="region"
                            render={({ field }) => (
                                <FormItem className="flex flex-col w-full items-start">
                                    <FormLabel>Region</FormLabel>
                                    <Select onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger className="w-full bg-inherit">
                                                <SelectValue placeholder="Select a locality"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-card text-secondary-foreground border">
                                            {Regions.map((region) => (
                                                <SelectItem
                                                    key={region.code}
                                                    className="focus:bg-accent_light"
                                                    value={region.code}
                                                >
                                                    {region.code}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-row w-full space-x-4">
                            <FormField
                                control={form.control}
                                name="space"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col w-full items-start">
                                        <FormLabel>Vector space</FormLabel>
                                        <Select onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full bg-inherit">
                                                    <SelectValue placeholder="Select a vector space"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-card text-secondary-foreground border">
                                                {Spaces.map((space) => (
                                                    <SelectItem
                                                        key={space.code}
                                                        className="focus:bg-accent_light"
                                                        value={space.code}
                                                    >
                                                        {space.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dimensions"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                        <FormLabel>Dimensions</FormLabel>
                                        <FormControl>
                                            <div className="flex flex-col w-full items-start gap-4">
                                                <Input
                                                    id="dimensions"
                                                    defaultValue="1536"
                                                    type={"number"}
                                                    className="bg-inherit"
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                        </div>
                        <AlertDialogFooter>
                            <Button
                                type="submit"
                                className="flex w-fit text-accent-foreground bg-accent hover:bg-accent_light"
                            >
                                <IoAdd className="w-8 h-8 mr-2"/>
                                Create
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
}