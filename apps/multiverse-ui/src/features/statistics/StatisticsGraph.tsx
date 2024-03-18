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

interface StatisticsGraphProps {
  title: string;
  data: {
    unit?: string;
    values: {
      value: number;
      timeString: string;
    }[];
  };
}

const CustomTooltip = ({
    active, payload, label
}: any) => {
    if (active && payload && payload.length) {
        return (
            <div
                className={"bg-card border border-border bg-opacity-100 p-2 rounded-md"}
            >
                <p className={"text-white text-xs"}>{`Date: ${label}`}</p>
                <p className={"text-white text-xs"}>{`Value: ${payload[0].value}`}</p>
            </div>
        );
    }

    return null;
};

export default function StatisticsGraph({ title, data }: StatisticsGraphProps) {
    const { theme } = useTheme();
    const handleCopy = async() => {
        navigator.clipboard
            .writeText(`${title}: ${JSON.stringify({
                title,
                data,
            })}`,)
            .then(() => {
                toast("Data have been copied into your clipboard.");
            })
            .catch(() => {
                console.log("Data could not be copied.");
            });
    };

    return (
        <div className={"flex flex-col w-full"}>
            <div className={"flex flex-row w-full items-center justify-between"}>
                <SectionTitle title={title} />
                <Button
                    className={"flex flex-row items-center bg-inherit border-0"}
                    onClick={handleCopy}
                >
                    <CopyIcon className={"w-6 h-6 mr-2"} />
          Copy data
                </Button>
            </div>
            <ResponsiveContainer width={"100%"} height={250}>
                <LineChart
                    className={"w-full"}
                    width={600}
                    height={250}
                    data={data.values.map((value) => {
                        return {
                            ...value,
                            Data: value.value,
                        };
                    })}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={"timeString"} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey={"Data"}
                        name={`${title}${data.unit ? ` (${data.unit})` : ""}`}
                        stroke={theme === "dark" ? "#FFEBC5" : "#C3A15E"}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}