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

export default function StatisticsGraph({ title, data }: StatisticsGraphProps) {
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
                    <YAxis dataKey={"value"} />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey={"Data"}
                        name={`${title}${data.unit ? ` (${data.unit})` : ""}`}
                        stroke="#FFEBC5"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}