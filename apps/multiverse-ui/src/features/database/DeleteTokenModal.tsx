"use client";

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
import { IoClose } from "react-icons/io5";

export default function DeleteTokenModal() {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <TrashIcon className={"w-6 h-6 mx-4 cursor-pointer"} />
            </AlertDialogTrigger>
            <AlertDialogContent className={"bg-card border-0"}>
                <AlertDialogHeader>
                    <div className={"flex flex-row justify-between"}>
                        <AlertDialogTitle>Delete Token</AlertDialogTitle>
                        <AlertDialogCancel
                            className={"border-0 bg-inherit hover:bg-inherit w-8 h-8 p-0 m-0"}
                        >
                            <IoClose className={"w-4 h-4"} />
                        </AlertDialogCancel>
                    </div>
                    <AlertDialogDescription className={"text-secondary-foreground"}>
            Do you really wish to delete this token? This action cannot be
            undone and all users using this token will lose access.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel
                        className={
                            "flex flex-row w-full justify-center bg-inherit hover:bg-primary "
                        }
                    >
                        <IoClose className={"w-6 h-6"} />
            Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={
                            "flex flex-row w-full justify-center bg-destructive text-destructive-foreground hover:bg-destructive_light"
                        }
                    >
                        <TrashIcon className={"w-6 h-6 mx-2"} />
            Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// const formSchema = z.object({
//     tokenName: z
//       .string()
//       .min(tokenName.length, { message: "Length does not equal" })
//       .refine(
//         (value) => {
//             return tokenName === value;
//         },
//         { message: "Token name does not match" },
//       ),
// });
//
// const form = useForm<z.infer<typeof formSchema>>({
//     defaultValues: { tokenName: "" },
// });
//
// const onSubmit = (values: z.infer<typeof formSchema>) => {
//     console.log(values);
// };
//     resolver: zodResolver(formSchema),

// <Form {...form}>
//     <form onSubmit={form.handleSubmit(onSubmit)}>
//         <FormField
//           control={form.control}
//           name="tokenName"
//           render={({ field }) => (
//             <FormItem>
//                 <FormControl>
//                     <Input placeholder="shadcn" {...field} />
//                 </FormControl>
//                 <FormMessage />
//             </FormItem>
//           )}
//         />
//         <Button type="submit">Delete</Button>
//     </form>
// </Form>