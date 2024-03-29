import { trpc } from "@/_trpc/client";
import {
    IoAdd, IoCheckmark, IoClose
} from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useModal from "@/features/modals/use-modal";
import {
    AlertDialog,
    AlertDialogContent, AlertDialogFooter,
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

const AwsTokenSchema = z.object({
    accessTokenId: z.string().min(8).max(256),
    secretAccessKey: z.string().min(16).max(256),
});

export default function AddAWSTokenModal() {
    const refetchToken = trpc.useUtils().getAwsToken.refetch;
    const mutation = trpc.addAwsToken.useMutation();

    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    const form = useForm<z.infer<typeof AwsTokenSchema>>({
        resolver: zodResolver(AwsTokenSchema),
        defaultValues: {
            accessTokenId: "",
            secretAccessKey: "",
        }
    });

    async function onSubmit(values: z.infer<typeof AwsTokenSchema>) {
        const result = await mutation.mutateAsync({
            accessTokenId: values.accessTokenId,
            secretAccessKey: values.secretAccessKey,
        });
        if (result) {
            await refetchToken();
            toast("AWS Token added");
        } else {
            toast("Error adding AWS Token");
        }
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
                            name="accessTokenId"
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
                        <AlertDialogFooter className="pt-8">
                            <Button
                                className="flex w-full bg-inherit hover:bg-primary border border-border"
                                onClick={handleCloseModal}
                            >
                                <IoClose className="w-6 h-6 mr-2" />
                            Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex w-full text-accent-foreground bg-accent hover:bg-accent_light"
                            >
                                <IoCheckmark className="w-6 h-6 mr-2" />
                            Add Token
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>

    );
}