"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FaRegTrashAlt } from "react-icons/fa";
import {
    IoAdd, IoClose, IoCheckmark
} from "react-icons/io5";
import { useState } from "react";

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
import { TrashIcon } from "lucide-react";

export default function AWSToken() {
    const [state, setState] = useState(0);

    const providedToken = (
        <div className={"flex flex-col w-full space-y-4"}>
            <h3 className={"text-tertiary-foreground"}>Public Key</h3>
            <Textarea title={"public"} placeholder="public key" />
            <h3 className={"text-tertiary-foreground"}>Private Key</h3>
            <Textarea title={"private"} placeholder="private key" />
            <AlertDialog>
                <AlertDialogTrigger asChild className={"flex w-fit self-end"}>
                    <Button
                        className={
                            " bg-destructive text-destructive-foreground hover:bg-destructive_light"
                        }
                    >
                        <FaRegTrashAlt className={"w-6 h-6 mr-2 "} />
            Remove token
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={"bg-secondary border-0"}>
                    <AlertDialogHeader>
                        <div className={"flex flex-row justify-between"}>
                            <AlertDialogTitle>Delete AWS token</AlertDialogTitle>
                            <AlertDialogCancel
                                className={
                                    "border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"
                                }
                            >
                                <IoClose className={"w-8 h-8"} />
                            </AlertDialogCancel>
                        </div>
                        <AlertDialogDescription>
              Do you really wish to delete this AWS Token? This action cannot be
              undone and Multiverse loses access to related AWS Account and
              databases.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={"hover:bg-secondary"}>
                            <IoClose className={"w-6 h-6 mr-2"} />
              Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={
                                "text-destructive-foreground bg-destructive hover:bg-destructive_light"
                            }
                            onClick={() => setState(1)}
                        >
                            <TrashIcon className={"w-6 h-6 mr-2"} />
              Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    const noToken = (
        <div className={"flex flex-col w-full space-y-4"}>
            <h3 className={"self-center text-secondary-foreground"}>
        No AWS token available
            </h3>
            <Button
                className={
                    "self-center flex w-fit bg-accent text-accent-foreground hover:bg-accent_light"
                }
                onClick={() => setState(2)}
            >
                <IoAdd className={"w-6 h-6 mr-2"} />
        Add AWS Token
            </Button>
        </div>
    );

    const tokenInput = (
        <div className={"flex flex-col w-full space-y-4"}>
            <h3 className={"text-tertiary-foreground"}>Public Key</h3>
            <Textarea title={"public"} placeholder="public key" />
            <h3 className={"text-tertiary-foreground"}>Private Key</h3>
            <Textarea title={"private"} placeholder="private key" />
            <div className={"flex flex-row justify-end space-x-4"}>
                <Button
                    variant={"outline"}
                    className={
                        "self-end flex w-fit bg-inherit text-primary-foreground outline-border hover:bg-secondary"
                    }
                    onClick={() => setState(1)}
                >
                    <IoClose className={"w-6 h-6 mr-2"} />
          Cancel
                </Button>
                <Button
                    className={
                        "self-end flex w-fit bg-accent text-accent-foreground hover:bg-accent_light"
                    }
                    onClick={() => setState(0)}
                >
                    <IoCheckmark className={"w-6 h-6 mr-2"} />
          Confirm
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {state === 0 && providedToken}
            {state === 1 && noToken}
            {state === 2 && tokenInput}
        </>
    );
}