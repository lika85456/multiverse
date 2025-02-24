import { customToast } from "@/features/fetching/CustomToast";
import type { Database } from "@/server/procedures/database";

export default function DatabaseInfo({ database }: {
    database: Database;
}) {
    const handleCopyData = async(value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            customToast("Data have been copied into your clipboard.");
        } catch (error) {
            customToast.error("Data could not be copied.");
        }
    };

    return (
        <ul className="flex flex-row space-x-4 lowercase text-secondary-foreground mb-4">
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions */}
            <li
                key="codeName"
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, database.codeName.toLowerCase())}
            >
                {database.codeName}
            </li>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions */}
            <li
                key="region"
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, database.region.toLowerCase())}
            >
                {database.region}
            </li>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions */}
            <li key="dimensions"
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, `${database.dimensions} dimensions`)}
            >
                <p className="font-bold mr-2">{database.dimensions}</p>
                <p>dimensions</p>
            </li>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions */}
            <li
                key="space"
                className="flex w-fit bg-card px-2 py-1 rounded-xl cursor-pointer hover:bg-middle transition-all"
                onClick={handleCopyData.bind(null, database.space.toLowerCase())}
            >
                {database.space}
            </li>
        </ul>
    );
}