import { toast } from "sonner";

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
    const handleCopyData = async(value: string) => {
        navigator.clipboard.writeText(value).then(
            () => {
                toast("Data have been copied into your clipboard.");
            },
            () => {
                console.log("Data could not be copied.");
            },
        );
    };

    return (
        <ul
            className={
                "flex flex-row space-x-4 lowercase text-secondary-foreground mb-4"
            }
        >
            <li
                className={
                    "flex w-fit bg-secondary px-2 py-1 rounded-xl cursor-pointer"
                }
                onClick={handleCopyData.bind(null, codename.toLowerCase())}
            >
                {codename}
            </li>
            <li
                className={
                    "flex w-fit bg-secondary px-2 py-1 rounded-xl cursor-pointer"
                }
                onClick={handleCopyData.bind(null, locality.toLowerCase())}
            >
                {locality}
            </li>
            <li
                className={
                    "flex w-fit bg-secondary px-2 py-1 rounded-xl cursor-pointer"
                }
                onClick={handleCopyData.bind(null, `${dimensions} dimensions`)}
            >
                <p className={"font-bold mr-2"}>{dimensions}</p>
                <p className={""}>dimensions</p>
            </li>
            <li
                className={
                    "flex w-fit bg-secondary px-2 py-1 rounded-xl cursor-pointer"
                }
                onClick={handleCopyData.bind(null, metrics.toLowerCase())}
            >
                {metrics}
            </li>
        </ul>
    );
}