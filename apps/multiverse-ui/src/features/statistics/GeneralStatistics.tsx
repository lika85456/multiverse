export interface GeneralStatisticsItemProps {
  label: string;
  value: string;
}

export interface GeneralStatisticsProps {
  items: GeneralStatisticsItemProps[];
}

export function GeneralStatisticsItem(item: GeneralStatisticsItemProps) {
    return (
        <li
            key={item.label}
            className="flex w-full flex-col items-start bg-secondary justify-between p-4 rounded-xl space-y-4 hover:bg-middle transition-all"
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