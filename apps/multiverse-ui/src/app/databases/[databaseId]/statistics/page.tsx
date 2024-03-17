"use client";

import { DateIntervalPicker } from "@/features/statistics/DateIntervalPicker";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export default function DatabaseStatistics() {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: addDays(new Date(), -7),
        to: new Date(),
    });

    return (
        <div>
            <DateIntervalPicker getDate={() => date} setDate={setDate} />
        </div>
    );
}

// React-Vis or Recharts Chart.js