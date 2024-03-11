import SpanLine from "@/app/layout/components/SpanLine";
import AWSToken from "@/features/account/AWSToken";
import PageTitle from "@/app/layout/components/PageTitle";
import SectionTitle from "@/app/layout/components/SectionTitle";

export default function Account() {
    const userName = "Michal Kornúc";

    return (
        <div
            className={
                "flex flex-1 flex-col w-full h-full px-72 justify-start items-center"
            }
        >
            <PageTitle title={`${userName} - account`} />
            <SpanLine />
            <SectionTitle title={"AWS Token"} />
            <AWSToken />
        </div>
    );
}