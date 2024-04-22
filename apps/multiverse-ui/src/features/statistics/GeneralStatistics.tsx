"use client";

import { cn } from "@/lib/utils";
import type { GeneralStatisticsData } from "@/server/procedures/statistics";
import format from "@/features/statistics/format";
import { customToast } from "@/features/fetching/CustomToast";

export interface GeneralStatisticsItemProps {
  title: string;
  value: string;
  enabled: boolean;
}

export interface GeneralStatisticsProps {
  items: GeneralStatisticsItemProps[] | undefined;
  className?: string;
}

export const createProps = (data: GeneralStatisticsData) => {
    return [
        {
            title: "Total Cost",
            value: `${data.costs.currency} ${data.costs.value}`,
            enabled: data.costs.enabled,
        },
        {
            title: "Total Vectors",
            value: `${format(data.totalVectors.count, "compact")} 
                    (${format(data.totalVectors.bytes, "bytes")})`,
            enabled: true,
        },
        {
            title: "Queries",
            value: `${format(data.reads, "compact")}`,
            enabled: true,
        },
        {
            title: "Writes",
            value: `${format(data.writes, "compact")}`,
            enabled: true,
        },
    ];
};

export function GeneralStatisticsItem({
    title,
    value,
    enabled,
}: GeneralStatisticsItemProps) {
    const handleCopy = async() => {
        try {
            await navigator.clipboard.writeText(`${title}: ${enabled ? value : "N/A"}`);
            customToast("Data have been copied into your clipboard.");
        } catch (error) {
            customToast.error("Data could not be copied.");
        }
    };

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions
        <li
            key={title}
            className="flex w-full flex-col items-start bg-card justify-between p-4 rounded-xl space-y-4 hover:bg-middle cursor-pointer transition-all"
            onClick={handleCopy}
        >
            <span className={"text-primary-foreground dark:text-contrast_secondary text-sm uppercase font-light tracking-[0.3rem]"}>
                {title}
            </span>
            {enabled && <span className="text-contrast_primary text-xl font-bold">{value}</span>}
            {!enabled && <span className="text-contrast_primary text-xl font-bold">N/A</span>}
        </li>
    );
}

export default function GeneralStatistics({
    items,
    className,
}: GeneralStatisticsProps) {
    return (
        <ul
            className={cn(
                "flex flex-row justify-between space-x-4 w-full",
                className,
            )}
        >
            {items && items.slice(0, 6).map((item) => {
                return (
                    <GeneralStatisticsItem
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        enabled={item.enabled}
                    />
                );
            })}
        </ul>
    );
}