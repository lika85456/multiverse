import { toast } from "sonner";

export interface DatabaseInfoProps {
  database: {
    codeName: string;
    locality: string;
    dimensions: number;
    metrics: string;
  };
}

export default function DatabaseInfo({ database }: DatabaseInfoProps) {
    const handleCopyData = async(value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast("Data have been copied into your clipboard.");
        } catch (error) {
            console.log("Data could not be copied.");
        }
    };

    return (
        <ul className="flex flex-row space-x-4 lowercase text-secondary-foreground mb-4">
            <li
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, database.codeName.toLowerCase())}
            >
                {database.codeName}
            </li>
            <li
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, database.locality.toLowerCase())}
            >
                {database.locality}
            </li>
            <li
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, `${database.dimensions} dimensions`)}
            >
                <p className="font-bold mr-2">{database.dimensions}</p>
                <p>dimensions</p>
            </li>
            <li
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, database.metrics.toLowerCase())}
            >
                {database.metrics}
            </li>
        </ul>
    );
}