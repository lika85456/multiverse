import AWSToken from "@/features/account/AWSToken";
import PageTitle from "@/app/layout/components/PageTitle";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/lib/mongodb/collections/user";

export default async function Account() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return null;

    return (
        <>
            <PageTitle title={`${sessionUser.name} - account`} />
            <Separator className="bg-border m-4" />
            <AWSToken />
        </>
    );
}