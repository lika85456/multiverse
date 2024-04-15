import SectionTitle from "@/app/layout/components/SectionTitle";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import type { StatisticsData } from "@/server/procedures/statistics";

interface StatisticsGraphProps {
  title: string;
  data: StatisticsData[];
  unit?: string;
}

const CustomTooltip = ({
    active, payload, label
}: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border bg-opacity-100 p-2 rounded-md">
                <p className="text-white text-xs">{`Date: ${label}`}</p>
                <p className="text-white text-xs">{`Value: ${payload[0].value}`}</p>
            </div>
        );
    }

    return null;
};

export default function StatisticsGraph({
    title, data, unit
}: StatisticsGraphProps) {
    const { theme } = useTheme();
    const handleCopy = async() => {
        try {
            await navigator.clipboard.writeText(`${title}: ${JSON.stringify({
                title,
                data,
            })}`,);
            toast("Data have been copied into your clipboard.");
        } catch (error) {
            console.log("Data could not be copied.");
        }
    };

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-row w-full items-center justify-between">
                <SectionTitle title={title} />
                <Button
                    className="flex flex-row items-center bg-inherit border-0"
                    onClick={handleCopy}
                >
                    <CopyIcon className="w-6 h-6 mr-2" />
          Copy data
                </Button>
            </div>
            <ResponsiveContainer width={"100%"} height={250}>
                <LineChart
                    className="w-full"
                    data={data.map((value) => {
                        return {
                            ...value,
                            Data: value.value,
                        };
                    })}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 0,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={"date"} />
                    <YAxis/>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                        type={"monotone"}
                        dataKey={"Data"}
                        name={`${title}${unit ? ` (${unit})` : ""}`}
                        stroke={theme === "dark" ? "#FFEBC5" : "#C3A15E"}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}