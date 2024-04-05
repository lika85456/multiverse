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
    const currentDate = new Date();

    const [date, setDate] = React.useState<DefinedDateRange>(defaultInterval,);
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


    return {
        date,
        handleDateIntervalChange,
    };
}