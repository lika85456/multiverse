"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/_trpc/client";

export interface GeneralStatisticsItemProps {
  label: string;
  value: string;
}

export interface GeneralStatisticsProps {
  items: GeneralStatisticsItemProps[];
  className?: string;
}

export function GeneralStatisticsItem({
    label,
    value,
}: GeneralStatisticsItemProps) {
    const handleCopy = async() => {
        try {
            await navigator.clipboard.writeText(`${label}: ${value}`);
            toast("Data have been copied into your clipboard.");
        } catch (error) {
            console.log("Data could not be copied.");
        }
    };

    return (
        <li
            key={label}
            className="flex w-full flex-col items-start bg-card justify-between p-4 rounded-xl space-y-4 hover:bg-middle cursor-pointer transition-all"
            onClick={handleCopy}
        >
            <span className="text-contrast_secondary text-sm uppercase font-thin tracking-[0.3rem]">
                {label}
            </span>
            <span className="text-contrast_primary text-xl font-bold">{value}</span>
        </li>
    );
}

export default function GeneralStatistics({
    items,
    className,
}: GeneralStatisticsProps) {
    const awsToken = trpc.getAwsToken.useQuery();
    if (!awsToken.data) {
        return null;
    }

    const trimmedItems = items.slice(0, 6);

    return (
        <ul
            className={cn(
                "flex flex-row justify-between space-x-4 w-full",
                className,
            )}
        >
            {trimmedItems.map((item) => {
                return (
                    <GeneralStatisticsItem
                        key={item.label}
                        value={item.value}
                        label={item.label}
                    />
                );
            })}
        </ul>
    );
}