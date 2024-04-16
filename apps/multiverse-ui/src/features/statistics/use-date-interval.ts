import { addDays, isAfter } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { UTCDate } from "@date-fns/utc";

export interface DefinedDateRange {
    from: UTCDate;
    to: UTCDate;
}

export default function useDateInterval(defaultInterval: DefinedDateRange = {
    from: addDays(new UTCDate(), -7),
    to: new UTCDate(),
}) {
    const [date, setDate] = React.useState<DefinedDateRange>(defaultInterval,);
    const handleDateIntervalChange = (newDate: DateRange | undefined) => {
        const currentDate = new UTCDate();
        // If the date interval is not properly defined, set the default interval
        if (!newDate || !newDate.from || !newDate.to) {
            toast("Invalid date interval. Displaying last 7 days.");
            setDate(defaultInterval);

            return;
        }
        let from = new UTCDate(newDate.from);
        let to = new UTCDate(newDate.to);

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
                toast("Invalid date interval. Displaying last 7 days.");
                setDate(defaultInterval);

                return;
            }
            // From is valid, trim to bound to the current date
            toast("Interval had been trimmed to the current date.");
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