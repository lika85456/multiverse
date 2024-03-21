"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import * as React from "react";
import StatisticsGraph from "@/features/statistics/StatisticsGraph";
import useDateInterval from "@/features/statistics/use-date-interval";

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
    const { date, handleDateIntervalChange } = useDateInterval();

    return (
        <div className="flex flex-col">
            <DateIntervalPicker
                className="self-end"
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