"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import { toast } from "sonner";
import { useEffect } from "react";

const requests = {
    title: "Requests",
    data: {
        unit: undefined,
        values: [
            {
                value: 100,
                timeString: "2022-01-01",
            },
            {
                value: 300,
                timeString: "2022-01-02",
            },
            {
                value: 200,
                timeString: "2022-01-03",
            },
            {
                value: 400,
                timeString: "2022-01-04",
            },
            {
                value: 100,
                timeString: "2022-01-05",
            },
            {
                value: 600,
                timeString: "2022-01-06",
            },
            {
                value: 400,
                timeString: "2022-01-07",
            },
        ],
    },
};

const costs = {
    title: "Costs",
    data: {
        unit: "$",
        values: [
            {
                value: 124,
                timeString: "2022-01-01",
            },
            {
                value: 25,
                timeString: "2022-01-02",
            },
            {
                value: 137,
                timeString: "2022-01-03",
            },
            {
                value: 427,
                timeString: "2022-01-04",
            },
            {
                value: 102,
                timeString: "2022-01-05",
            },
            {
                value: 150,
                timeString: "2022-01-06",
            },
            {
                value: 400,
                timeString: "2022-01-07",
            },
        ],
    },
};

const responseTime = {
    title: "Response Time",
    data: {
        unit: "ms",
        values: [
            {
                value: 100,
                timeString: "2022-01-01",
            },
            {
                value: 300,
                timeString: "2022-01-02",
            },
            {
                value: 300,
                timeString: "2022-01-03",
            },
            {
                value: 400,
                timeString: "2022-01-04",
            },
            {
                value: 100,
                timeString: "2022-01-05",
            },
            {
                value: 500,
                timeString: "2022-01-06",
            },
            {
                value: 400,
                timeString: "2022-01-07",
            },
        ],
    },
};

const writeCount = {
    title: "Write Count",
    data: {
        unit: undefined,
        values: [
            {
                value: 100,
                timeString: "2022-01-01",
            },
            {
                value: 300,
                timeString: "2022-01-02",
            },
            {
                value: 200,
                timeString: "2022-01-03",
            },
            {
                value: 400,
                timeString: "2022-01-04",
            },
            {
                value: 100,
                timeString: "2022-01-05",
            },
            {
                value: 100,
                timeString: "2022-01-06",
            },
            {
                value: 400,
                timeString: "2022-01-07",
            },
        ],
    },
};

export default function DatabaseStatistics() {
    const defaultInterval = {
        from: addDays(new Date(), -7),
        to: new Date(),
    };
    const currentDate = new Date();

    const [date, setDate] = React.useState<DateRange | undefined>(defaultInterval,);
    const handleDateIntervalChange = (newDate: DateRange | undefined) => {
        if (!newDate) {
            toast("No date interval selected. Displaying last 7 days.");
            setDate(defaultInterval);

            return;
        } else if (
            newDate.to &&
      newDate.from &&
      newDate.to.getDate() > currentDate.getDate()
        ) {
            console.log("debug", newDate.to);
            toast("Interval had been trimmed to the current date.");
            if (
                newDate.from > currentDate ||
        newDate.from.getDate() > newDate.to.getDate()
            ) {
                setDate({
                    from: currentDate,
                    to: currentDate,
                });

                return;
            }
            setDate({
                from: newDate.from,
                to: currentDate,
            });

            return;
        } else if (!newDate.to || !newDate.from) {
            toast("Invalid date interval. Displaying last 7 days.");
            setDate(defaultInterval);

            return;
        }
    };

    useEffect(() => {
        console.log("Date interval changed to ", date);
    }, [date]);

    return (
        <div className={"flex flex-col"}>
            <DateIntervalPicker
                className={"self-end"}
                getDate={() => date}
                setDate={handleDateIntervalChange}
            />
            <StatisticsGraph title={requests.title} data={requests.data} />
            <StatisticsGraph title={costs.title} data={costs.data} />
            <StatisticsGraph title={responseTime.title} data={responseTime.data} />
            <StatisticsGraph title={writeCount.title} data={writeCount.data} />
        </div>
    );
}

// React-Vis Recharts Chart.js