export interface DatabaseInfoProps {
  codename: string;
  locality: string;
  dimensions: number;
  metrics: string;
}

export default function DatabaseInfo({
    codename,
    locality,
    dimensions,
    metrics,
}: DatabaseInfoProps) {
    return (
        <ul
            className={
                "flex flex-row space-x-4 lowercase text-secondary-foreground mb-4"
            }
        >
            <li className={"flex w-fit bg-secondary px-2 py-1 rounded-xl"}>
                {codename}
            </li>
            <li className={"flex w-fit bg-secondary px-2 py-1 rounded-xl"}>
                {locality}
            </li>
            <li className={"flex w-fit bg-secondary px-2 py-1 rounded-xl"}>
                <p className={"font-bold mr-2"}>{dimensions}</p>
                <p className={""}>dimensions</p>
            </li>
            <li className={"flex w-fit bg-secondary px-2 py-1 rounded-xl"}>
                {metrics}
            </li>
        </ul>
    );
}