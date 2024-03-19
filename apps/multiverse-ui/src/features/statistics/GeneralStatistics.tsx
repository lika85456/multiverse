"use client";

import { toast } from "sonner";

export interface GeneralStatisticsItemProps {
  label: string;
  value: string;
}

export interface GeneralStatisticsProps {
  items: GeneralStatisticsItemProps[];
}

export function GeneralStatisticsItem(item: GeneralStatisticsItemProps) {
    const handleCopy = async() => {
        navigator.clipboard
            .writeText(`${item.label}: ${item.value}`)
            .then(() => {
                toast("Data have been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Data could not be copied.");
            });
    };

    return (
        <li
            key={item.label}
            className="flex w-full flex-col items-start bg-card justify-between p-4 rounded-xl space-y-4 hover:bg-middle cursor-pointer transition-all"
            onClick={handleCopy}
        >
            <span className="text-contrast_secondary text-sm uppercase font-thin tracking-[0.3rem]">
                {item.label}
            </span>
            <span className="text-contrast_primary text-xl font-bold">
                {item.value}
            </span>
        </li>
    );
}

export default function GeneralStatistics({ items }: GeneralStatisticsProps) {
    if (items.length === 0) return <></>;
    const trimmedItems = items.slice(0, 6);

    const statisticsItems = trimmedItems.map((item) => {
        return GeneralStatisticsItem(item);
    });

    return (
        <ul className="flex flex-row justify-between space-x-4 w-full">
            {statisticsItems}
        </ul>
    );
}