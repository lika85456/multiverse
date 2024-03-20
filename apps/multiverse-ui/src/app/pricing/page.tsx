import PageTitle from "@/app/layout/components/PageTitle";
import { Separator } from "@/components/ui/separator";
import PricingStatistics from "@/features/statistics/PricingStatistics";

export default function Pricing() {
    return (
        <>
            <PageTitle title={"Pricing"} />
            <Separator className="mb-4" />
            <PricingStatistics />
        </>
    );
}