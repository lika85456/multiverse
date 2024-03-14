"use client";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    // AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TrashIcon } from "lucide-react";
import { IoClose } from "react-icons/io5";
import { Button } from "@/components/ui/button";
// import { z } from "zod";
// import { Form, useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import {
//     FormControl,
//     FormField,
//     FormItem,
//     FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";

const dbName = "Database Chatbot 1";

export default function DeleteDatabaseModal() {
    // const formSchema = z.object({
    //     databaseName: z
    //         .string()
    //         .min(dbName.length, { message: "Length does not equal" })
    //         .refine(
    //             (value) => {
    //                 return dbName === value;
    //             },
    //             { message: "Database name does not match" },
    //         ),
    // });
    //
    // const form = useForm<z.infer<typeof formSchema>>({
    //     defaultValues: { databaseName: "" },
    //
    //     resolver: zodResolver(formSchema),
    // });
    //
    // const onSubmit = (values: z.infer<typeof formSchema>) => {
    //     console.log(values);
    // };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    className={
                        "flex w-fit self-end text-destructive-foreground bg-destructive hover:bg-destructive_light"
                    }
                >
                    <TrashIcon className={"w-6 h-6 mr-2"} />
          Delete database
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>Delete Database</AlertDialogTitle>
                        <AlertDialogCancel
                            className={"border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"}
                        >
                            <IoClose className={"w-4 h-4"} />
                        </AlertDialogCancel>
                    </div>
                    <AlertDialogDescription className={"text-secondary-foreground"}>
            Do you really wish to delete this database? This action cannot be
            undone. To delete this database, type “{dbName}”
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/*  <Form {...form}>*/}
                {/*      <form onSubmit={form.handleSubmit(onSubmit)}>*/}
                {/*          <FormField*/}
                {/*              control={form.control}*/}
                {/*              name="databaseName"*/}
                {/*              render={({ field }) => (*/}
                {/*                  <FormItem>*/}
                {/*                      <FormControl>*/}
                {/*                          <Input placeholder="shadcn" {...field} />*/}
                {/*                      </FormControl>*/}
                {/*                      <FormMessage />*/}
                {/*                  </FormItem>*/}
                {/*              )}*/}
                {/*          />*/}

                {/*          <AlertDialogFooter>*/}
                {/*f<Button type="submit">Delete</Button>*/}
                {/*          </AlertDialogFooter>*/}
                {/*      </form>*/}
                {/*  </Form>*/}
            </AlertDialogContent>
        </AlertDialog>
    );
}