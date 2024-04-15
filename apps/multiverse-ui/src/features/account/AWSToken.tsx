"use client";

import { DeleteAWSTokenModal } from "@/features/account/DeleteAWSTokenModal";
import { trpc } from "@/lib/trpc/client";
import SectionTitle from "@/app/layout/components/SectionTitle";
import AddAWSTokenModal from "@/features/account/AddAWSTokenModal";

export default function AWSToken() {
    const {
        data: awsToken, isLoading, isSuccess, isError
    } = trpc.awsToken.get.useQuery();

    return (
        <>
            <SectionTitle title={"AWS Token"} />
            <div className="flex flex-col w-full space-y-4">
                {isLoading && <div> Loading... </div>}
                {isError && <div> Error </div>}
                {isSuccess && !awsToken && (
                    <>
                        <h3 className="self-center text-secondary-foreground">
                            No AWS token provided
                        </h3>
                        <AddAWSTokenModal />
                    </>
                )}
                {isSuccess && awsToken && (
                    <div className="flex flex-row items-center w-full border border-border rounded-xl p-4">
                        <div className="flex flex-col w-full">
                            <h3 className="text-tertiary-foreground">Access Token Id</h3>
                            <div className="text-primary-foreground py-2">
                                {awsToken.accessKeyId}
                            </div>
                        </div>
                        <DeleteAWSTokenModal />
                    </div>
                )}

            </div>
        </>
    );
}