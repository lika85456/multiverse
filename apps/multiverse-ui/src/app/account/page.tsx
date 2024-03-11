import AWSToken from "@/features/account/AWSToken";
import PageTitle from "@/app/layout/components/PageTitle";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Separator } from "@/components/ui/separator";

export default function Account() {
    const userName = "Michal Kornúc";

    return (
        <>
            <PageTitle title={`${userName} - account`} />
            <Separator className={"bg-border m-4"} />
            <SectionTitle title={"AWS Token"} />
            <AWSToken />
        </>
    );
}