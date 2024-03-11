"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaRegTrashAlt } from "react-icons/fa";
import {
    IoAdd, IoClose, IoCheckmark
} from "react-icons/io5";
import { useState } from "react";

export default function AWSToken() {
    const [state, setState] = useState(0);

    const providedToken = (
        <div className={"flex flex-col w-full space-y-4"}>
            <h3 className={"text-tertiary-foreground"}>Public Key</h3>
            <Input title={"public"} type="text" placeholder="public key" />
            <h3 className={"text-tertiary-foreground"}>Private Key</h3>
            <Input title={"private"} type="text" placeholder="private key" />
            <Button
                className={
                    "self-end flex w-fit bg-destructive text-destructive-foreground hover:bg-destructive_light"
                }
                onClick={() => setState(1)}
            >
                <FaRegTrashAlt className={"w-6 h-6 mr-2 "} />
        Remove token
            </Button>
        </div>
    );

    const noToken = (
        <div className={"flex flex-col w-full space-y-4"}>
            <h3 className={"self-center text-tertiary"}>No AWS token available</h3>
            <Button
                className={
                    "self-center flex w-fit bg-accent text-primary-foreground hover:bg-accent_light"
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
            <Input title={"public"} type="text" placeholder="public key" />
            <h3 className={"text-tertiary-foreground"}>Private Key</h3>
            <Input title={"private"} type="text" placeholder="private key" />
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
                        "self-end flex w-fit bg-accent text-primary-foreground hover:bg-accent_light"
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