import AWSToken from "@/features/account/AWSToken";
import PageTitle from "@/app/layout/components/PageTitle";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { redirect } from "next/navigation";

export default async function Account() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return redirect("/login");
    }

    return (
        <>
            <PageTitle title={`${sessionUser.name ?? sessionUser?.email?.split("@")[0]} - account`} />
            <Separator className="bg-border m-4" />
            <AWSToken />
        </>
    );
}