import { trpc } from "@/lib/trpc/client";
import {
    IoAdd, IoCheckmark, IoClose
} from "react-icons/io5";
import { Button } from "@/components/ui/button";
import useModal from "@/features/modal/use-modal";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { customToast } from "@/features/fetching/CustomToast";
import { useState } from "react";
import Spinner from "@/features/fetching/Spinner";

const AwsTokenSchema = z.object({
    accessKeyId: z.string().min(8).max(256),
    secretAccessKey: z.string().min(16).max(256),
});

export default function AddAWSTokenModal() {
    const [isProcessing, setIsProcessing] = useState(false);
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const refetchToken = trpc.useUtils().awsToken.get.refetch;
    const mutation = trpc.awsToken.post.useMutation({
        onSuccess: async() => {
            try {
                await refetchToken();
                handleCloseModal();
                setIsProcessing(false);
            } catch (error) {
                customToast.error("Error adding AWS Token");
                setIsProcessing(false);
            }
        }
    });

    const form = useForm<z.infer<typeof AwsTokenSchema>>({
        resolver: zodResolver(AwsTokenSchema),
        defaultValues: {
            accessKeyId: "",
            secretAccessKey: "",
        }
    });

    async function onSubmit(values: z.infer<typeof AwsTokenSchema>) {
        setIsProcessing(true);
        await mutation.mutateAsync({
            accessKeyId: values.accessKeyId,
            secretAccessKey: values.secretAccessKey,
        });
    }

    return (
        <AlertDialog open={modalOpen}>
            <AlertDialogTrigger
                asChild
                className="flex w-fit"
                onClick={handleOpenModal}
            >
                <Button
                    className="self-center flex w-fit bg-accent text-accent-foreground hover:bg-accent_light"
                    onClick={handleOpenModal}
                >
                    <IoAdd className="w-6 h-6 mr-2" />
                    Add AWS Token
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-0">
                <Form {...form}>
                    <AlertDialogHeader>
                        <div className="flex flex-row justify-between">
                            <AlertDialogTitle>Set AWS token</AlertDialogTitle>
                            <IoClose
                                onClick={handleCloseModal}
                                className="w-4 h-4 cursor-pointer hover:text-secondary-foreground transition-all "
                            />
                        </div>
                    </AlertDialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                            control={form.control}
                            name="accessKeyId"
                            render={({ field }) => (

                                <FormItem>
                                    <FormLabel>Access Token Id</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Access Token Id" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>

                            )}
                        />
                        <FormField
                            control={form.control}
                            name="secretAccessKey"
                            render={({ field }) => (

                                <FormItem>
                                    <FormLabel>Secret Access Key</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Secret Access Key" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>

                            )}
                        />
                        <div className="flex flex-row pt-8 space-x-4">
                            <Button
                                className="flex w-full bg-inherit hover:bg-primary"
                                onClick={handleCloseModal}
                                disabled={isProcessing}
                            >
                                <IoClose className="w-6 h-6 mr-2" />
                            Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex w-full text-accent-foreground bg-accent hover:bg-accent_light"
                                disabled={isProcessing}
                            >{!isProcessing && <IoCheckmark className="w-6 h-6 mr-2" />}
                                {isProcessing && <div className="mr-2">
                                    <Spinner/>
                                </div>}
                                Add Token
                            </Button>
                        </div>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>

    );
}