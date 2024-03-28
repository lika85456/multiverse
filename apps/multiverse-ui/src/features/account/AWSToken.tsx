"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    IoAdd, IoClose, IoCheckmark
} from "react-icons/io5";
import { useState } from "react";
import { DeleteAWSTokenModal } from "@/features/account/DeleteAWSTokenModal";
import { trpc } from "@/_trpc/client";

enum AWSTokenState {
  VIEW = 0,
  NO_TOKEN = 1,
  ADD_TOKEN = 2,
}

export default function AWSToken() {
    const [state, setState] = useState<AWSTokenState>(AWSTokenState.VIEW);
    const mutation = trpc.addAwsToken.useMutation();
    const handleAddAwsToken = () => {
        mutation.mutate({
            accessTokenId: "123",
            secretAccessKey: "123",
        });
    };

    return (
        <div className="flex flex-col w-full space-y-4">
            <Button onClick={handleAddAwsToken}>Add AWS Token</Button>
            {state === AWSTokenState.VIEW && (
                <>
                    <h3 className="text-tertiary-foreground">Public Key</h3>
                    <Textarea title={"public"} placeholder="public key" />
                    <h3 className="text-tertiary-foreground">Private Key</h3>
                    <Textarea title={"private"} placeholder="private key" />
                    <DeleteAWSTokenModal setState={setState} />
                </>
            )}
            {state === AWSTokenState.NO_TOKEN && (
                <>
                    <h3 className="self-center text-secondary-foreground">
            No AWS token available
                    </h3>
                    <Button
                        className="self-center flex w-fit bg-accent text-accent-foreground hover:bg-accent_light"
                        onClick={() => setState(2)}
                    >
                        <IoAdd className="w-6 h-6 mr-2" />
            Add AWS Token
                    </Button>
                </>
            )}
            {state === AWSTokenState.ADD_TOKEN && (
                <>
                    <h3 className="text-tertiary-foreground">Public Key</h3>
                    <Textarea title={"public"} placeholder="public key" />
                    <h3 className="text-tertiary-foreground">Private Key</h3>
                    <Textarea title={"private"} placeholder="private key" />
                    <div className="flex flex-row justify-end space-x-4">
                        <Button
                            variant={"outline"}
                            className="self-end flex w-fit bg-inherit text-primary-foreground outline-border hover:bg-secondary"
                            onClick={() => setState(1)}
                        >
                            <IoClose className="w-6 h-6 mr-2" />
              Cancel
                        </Button>
                        <Button
                            className="self-end flex w-fit bg-accent text-accent-foreground hover:bg-accent_light"
                            onClick={() => setState(0)}
                        >
                            <IoCheckmark className="w-6 h-6 mr-2" />
              Confirm
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}