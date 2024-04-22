"use client";

import SectionTitle from "@/app/layout/components/SectionTitle";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useState } from "react";
import { IoIosWarning } from "react-icons/io";
import { Warning } from "@/features/fetching/Warning";

export function CostGeneratorAcceptor() {
    const [isAccepted, setIsAccepted] = useState(false);
    const { data: costGenerator } = trpc.costGenerator.get.useQuery();
    const mutation = trpc.costGenerator.update.useMutation();

    useEffect(() => {
        setIsAccepted(costGenerator?.enabled ?? false);
    }, [costGenerator]);

    const handleAcceptanceChange = async() => {
        const costs = await mutation.mutateAsync(!isAccepted);
        setIsAccepted(costs.enabled);
    };

    return (
        <div className="flex flex-col w-full">
            <SectionTitle title={"Costs calculation"} />
            <div className="flex flex-row justify-between my-2 border-border border p-4 rounded-xl">
                <h1>Costs calculation with the usage of AWS Costs Explorer API</h1>
                <Switch
                    checked={isAccepted}
                    onCheckedChange={handleAcceptanceChange}
                />
            </div>
            {isAccepted && (
                <Warning>
                    Cost calculation is turned on. Each costs view (general or daily statistics) will cost you <span className="text-warning font-bold">0.01$</span> per request.
                </Warning>
            )}
        </div>
    );
}