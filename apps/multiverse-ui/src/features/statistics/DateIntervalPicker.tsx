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
import { useEffect } from "react";

enum PredefinedOptions {
  TODAY = "today",
  LAST_WEEK = "last-week",
  LAST_MONTH = "last-month",
  LAST_YEAR = "last-year",
  CUSTOM = "custom",
}

type DateIntervalPickerProps = {
  getDate: () => DateRange | undefined;
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  className?: React.HTMLAttributes<HTMLDivElement>;
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

    const handleCloseModal = () => {
        setNewDate(getDate());
        setNewPredefinedChoice(prevPredefinedChoice);
        setModalOpen(false);
    };

    const handleSubmitInterval = () => {
        setDate(newDate);
        setPrevPredefinedChoice(newPredefinedChoice);
        setModalOpen(false);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleCloseModal();
            }
        };
        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    const handlePredefinedOptionChoice = (option: PredefinedOptions) => {
        switch (option) {
        case PredefinedOptions.TODAY:
            setNewDate({
                from: new Date(),
                to: new Date(),
            });
            break;
        case PredefinedOptions.LAST_WEEK:
            setNewDate({
                from: addDays(new Date(), -7),
                to: new Date(),
            });
            break;
        case PredefinedOptions.LAST_MONTH:
            setNewDate({
                from: addMonths(new Date(), -1),
                to: new Date(),
            });
            break;
        case PredefinedOptions.LAST_YEAR:
            setNewDate({
                from: addYears(new Date(), -1),
                to: new Date(),
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
                    className="flex flex-row border-0 w-auto p-0 bg-card rounded-xl"
                    align="start"
                >
                    <ul className={"bg-grey30 p-2 rounded-l-xl"}>
                        <li
                            onClick={handlePredefinedOptionChoice.bind(
                                null,
                                PredefinedOptions.TODAY,
                            )}
                            className={`rounded ${
                                newPredefinedChoice === "today" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Today
                        </li>
                        <li
                            onClick={handlePredefinedOptionChoice.bind(
                                null,
                                PredefinedOptions.LAST_WEEK,
                            )}
                            className={`rounded ${
                                newPredefinedChoice === "last-week" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Last Week
                        </li>
                        <li
                            onClick={handlePredefinedOptionChoice.bind(
                                null,
                                PredefinedOptions.LAST_MONTH,
                            )}
                            className={`rounded ${
                                newPredefinedChoice === "last-month" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Last Month
                        </li>
                        <li
                            onClick={handlePredefinedOptionChoice.bind(
                                null,
                                PredefinedOptions.LAST_YEAR,
                            )}
                            className={`rounded ${
                                newPredefinedChoice === "last-year" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Last Year
                        </li>
                        <li
                            onClick={handlePredefinedOptionChoice.bind(
                                null,
                                PredefinedOptions.CUSTOM,
                            )}
                            className={`rounded ${
                                newPredefinedChoice === "custom" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Custom
                        </li>
                    </ul>
                    <div className={"p-4"}>
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={getDate()?.from}
                            selected={newDate}
                            onSelect={(e) => {
                                handlePredefinedOptionChoice(PredefinedOptions.CUSTOM);
                                setNewDate(e);
                            }}
                            numberOfMonths={2}
                            className={"bg-primary rounded-xl"}
                        />
                        <div>
                            <Button onClick={handleCloseModal}>Cancel</Button>
                            <Button onClick={handleSubmitInterval}>Confirm</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}