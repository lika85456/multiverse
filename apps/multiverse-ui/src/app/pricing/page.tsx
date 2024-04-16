import PageTitle from "@/app/layout/components/PageTitle";
import { Separator } from "@/components/ui/separator";
import PricingStatistics from "@/features/statistics/PricingStatistics";
import PriceCalculator from "@/features/statistics/calculator/PriceCalculator";
import * as React from "react";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Pricing() {
    const session = await getServerSession(authOptions);
    const sessionUser = await getSessionUser();

    return (
        <div className="flex flex-col w-full">
            <PageTitle title={"Pricing"} />
            <Separator className="mb-4" />
            {session && sessionUser && <PricingStatistics />}
            <Separator />
            <PriceCalculator />
        </div>
    );
}