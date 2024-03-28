"use client";

import { Button } from "@/components/ui/button";
import { IoAdd } from "react-icons/io5";
import { DeleteAWSTokenModal } from "@/features/account/DeleteAWSTokenModal";
import { trpc } from "@/_trpc/client";
import SectionTitle from "@/app/layout/components/SectionTitle";

export default function AWSToken() {
    const {
        data: awsToken, isFetched, isError
    } = trpc.getAwsToken.useQuery();

    return (
        <>
            <SectionTitle title={"AWS Token"} />
            <div className="flex flex-col w-full space-y-4">
                {isFetched && awsToken && (
                    <div className="flex flex-row items-center w-full border border-border rounded-xl p-4">
                        <div className="flex flex-col w-full">
                            <h3 className="text-tertiary-foreground">Access Token Id</h3>
                            <div className="text-primary-foreground py-2">
                                {awsToken.accessTokenId}
                            </div>
                        </div>
                        <DeleteAWSTokenModal />
                    </div>
                )}
                {isFetched && !awsToken && (
                    <>
                        <h3 className="self-center text-secondary-foreground">
              No AWS token available
                        </h3>
                        <Button className="self-center flex w-fit bg-accent text-accent-foreground hover:bg-accent_light">
                            <IoAdd className="w-6 h-6 mr-2" />
              Add AWS Token
                        </Button>
                    </>
                )}
                {!isFetched && !isError && <div> Loading... </div>}
                {isError && <div> Error </div>}
            </div>
        </>
    );
}