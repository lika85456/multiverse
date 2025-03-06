import { format, isAfter } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { UTCDate } from "@date-fns/utc";
import { customToast } from "@/features/fetching/CustomToast";

export interface DefinedDateRange {
    from: UTCDate;
    to: UTCDate;
}

export default function useDateInterval(defaultInterval: DefinedDateRange = {
    from: new UTCDate(new UTCDate().getFullYear(), new UTCDate().getMonth(), 1),
    to: new UTCDate(),
}) {
    const [date, setDate] = React.useState<DefinedDateRange>(defaultInterval,);
    const handleDateIntervalChange = (newDate: DateRange | undefined) => {
        const currentDate = new UTCDate();
        // If the date interval is not properly defined, set the default interval
        if (!newDate || !newDate.from || !newDate.to) {
            customToast.error("Invalid date interval. Displaying default period.");
            setDate(defaultInterval);

            return;
        }
        let from = new UTCDate(format(newDate.from, "yyyy-MM-dd"));
        let to = new UTCDate(format(newDate.to, "yyyy-MM-dd"));

        // Check flip reversed interval bounds
        if (isAfter(from, to)) {
            const tmp = from;
            from = to;
            to = tmp;
        }

        // Check if the interval is in the future
        if (isAfter(to, currentDate)) {
            // Check from bound of the interval
            if (isAfter(from, currentDate)) {
                customToast.error("Invalid date interval. Displaying default period.");
                setDate(defaultInterval);

                return;
            }
            // From is valid, trim to bound to the current date
            customToast.info("Interval had been trimmed to the current date.");
            setDate({
                from: from,
                to: currentDate,
            });

            return;
        }

        // Set the new date interval without changes
        setDate({
            from: from,
            to: to,
        });
    };

    return {
        dateRange: date,
        handleDateIntervalChange,
    };
}