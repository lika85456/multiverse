import { addDays } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

export interface DefinedDateRange {
    from: Date;
    to: Date;
}

export default function useDateInterval() {
    const defaultInterval: DefinedDateRange = {
        from: addDays(new Date(), -7),
        to: new Date(),
    };

    const [date, setDate] = React.useState<DefinedDateRange>(defaultInterval,);
    const handleDateIntervalChange = (newDate: DateRange | undefined) => {
        const currentDate = new Date();
        // If the date interval is not properly defined, set the default interval
        if (!newDate || !newDate.from || !newDate.to) {
            toast("Invalid date interval. Displaying last 7 days.");
            setDate(defaultInterval);

            return;
        }
        let from = newDate.from;
        let to = newDate.to;

        // Check flip reversed interval bounds
        if (from > to) {
            const tmp = from;
            from = to;
            to = tmp;
        }

        // Check if the interval is in the future
        if (to > currentDate) {
            // Check from bound of the interval
            if (from > currentDate) {
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
        // TODO - Check if the interval is too short
        // TODO - Check if the interval is too long

        // Set the new date interval without changes
        setDate({
            from: from,
            to: to,
        });
    };

    return {
        date,
        handleDateIntervalChange,
    };
}