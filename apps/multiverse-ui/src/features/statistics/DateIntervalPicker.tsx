import * as React from "react";
import {
    addDays, addYears, addMonths, format
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useCallback, useEffect } from "react";
import { IoCheckmark, IoClose } from "react-icons/io5";
import { UTCDate } from "@date-fns/utc";

export enum PredefinedOptions {
  // TODAY = "Today",
  LAST_WEEK = "Last Week",
  THIS_MONTH = "This Month",
  LAST_MONTH = "Last Month",
  LAST_YEAR = "Last Year",
  CUSTOM = "Custom",
}

type DateIntervalPickerProps = {
  getDate: () => DateRange | undefined;
  setDate: (newDate: DateRange | undefined) => void;
  className?: string;
};

export function DateIntervalPicker({
    getDate,
    setDate,
    className,
}: DateIntervalPickerProps) {
    const [modalOpen, setModalOpen] = React.useState(false);

    const [prevPredefinedChoice, setPrevPredefinedChoice] =
    React.useState<PredefinedOptions>(PredefinedOptions.CUSTOM);
    const [newPredefinedChoice, setNewPredefinedChoice] =
    React.useState<PredefinedOptions>(prevPredefinedChoice);
    const [newDate, setNewDate] = React.useState<DateRange | undefined>({
        from: getDate()?.from,
        to: getDate()?.to,
    });

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = useCallback(() => {
        setNewDate(getDate());
        setNewPredefinedChoice(prevPredefinedChoice);
        setModalOpen(false);
    }, [getDate, prevPredefinedChoice]);

    const handleSubmitInterval = () => {
        setDate(newDate);
        setPrevPredefinedChoice(newPredefinedChoice);
        setModalOpen(false);
    };

    useEffect(() => {
    // Update newDate state whenever the date changes in the parent component
        setNewDate({
            from: getDate()?.from,
            to: getDate()?.to,
        });
    }, [getDate]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleCloseModal();
            }
        };
        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);
    }, [handleCloseModal]);

    const handlePredefinedOptionChoice = (option: PredefinedOptions) => {
        switch (option) {
        case PredefinedOptions.LAST_WEEK:
            setNewDate({
                from: addDays(new UTCDate(), -7),
                to: new UTCDate(),
            });
            break;
        case PredefinedOptions.THIS_MONTH:
            setNewDate({
                from: new UTCDate(new UTCDate().getFullYear(), new UTCDate().getMonth(), 1),
                to: new UTCDate(),
            });
            break;
        case PredefinedOptions.LAST_MONTH:
            setNewDate({
                from: addMonths(new UTCDate(), -1),
                to: new UTCDate(),
            });
            break;
        case PredefinedOptions.LAST_YEAR:
            setNewDate({
                from: addYears(new UTCDate(), -1),
                to: new UTCDate(),
            });
            break;
        case PredefinedOptions.CUSTOM:
            break;
        }
        setNewPredefinedChoice(option);
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={modalOpen}>
                <PopoverTrigger asChild>
                    <Button
                        onClick={handleOpenModal}
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal bg-secondary border-0 rounded-xl",
                            !newDate && "text-muted-foreground",
                            "hover:bg-secondary",
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDate?.from ? (
                            newDate.to ? (
                                <>
                                    {format(newDate.from, "LLL dd, y")} -{" "}
                                    {format(newDate.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(newDate.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="flex flex-row border-0 w-auto p-0 bg-card rounded-md"
                    align="end"
                >
                    <ul className="w-40 bg-grey30 p-2 rounded-l-md space-y-2">
                        {[
                            PredefinedOptions.LAST_WEEK,
                            PredefinedOptions.THIS_MONTH,
                            PredefinedOptions.LAST_MONTH,
                            PredefinedOptions.LAST_YEAR,
                            PredefinedOptions.CUSTOM,
                        ].map((option) => {
                            return (
                                // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions
                                <li
                                    key={option}
                                    onClick={handlePredefinedOptionChoice.bind(null, option)}
                                    className={`rounded-md p-2 hover:bg-primary transition-all select-none cursor-pointer ${
                                        newPredefinedChoice === option ? "bg-card" : "bg-inherit"
                                    }`}
                                >
                                    {option}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="p-2 space-y-2">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={getDate()?.from}
                            selected={newDate}
                            onSelect={(dateRange) => {
                                handlePredefinedOptionChoice(PredefinedOptions.CUSTOM);
                                setNewDate(dateRange);
                            }}
                            numberOfMonths={2}
                            className="bg-primary rounded-md"
                        />
                        <div className="flex flex-row justify-end space-x-4">
                            <Button
                                onClick={handleCloseModal}
                                className="bg-inherit text-primary-foreground border border-border"
                            >
                                <IoClose className="w-6 h-6 mr-2" />
                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmitInterval}
                                className="bg-accent text-accent-foreground hover:bg-accent_light"
                            >
                                <IoCheckmark className="w-6 h-6 mr-2" />
                Confirm
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}