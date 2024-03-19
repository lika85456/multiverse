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
import { useEffect, useMemo } from "react";
import { IoCheckmark, IoClose } from "react-icons/io5";
import { toast } from "sonner";

enum PredefinedOptions {
  TODAY = "Today",
  LAST_WEEK = "Last Week",
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
    React.useState<PredefinedOptions>(PredefinedOptions.LAST_WEEK);
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

    const memoizedGetDate = useMemo(() => getDate, [getDate]);

    useEffect(() => {
    // Update newDate state whenever the date changes in the parent component
        setNewDate({
            from: memoizedGetDate()?.from,
            to: memoizedGetDate()?.to,
        });
    }, [memoizedGetDate]);

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
                    align="end"
                >
                    <ul className={"w-40 bg-grey30 p-2 rounded-l-xl space-y-2"}>
                        {[
                            PredefinedOptions.TODAY,
                            PredefinedOptions.LAST_WEEK,
                            PredefinedOptions.LAST_MONTH,
                            PredefinedOptions.LAST_YEAR,
                            PredefinedOptions.CUSTOM,
                        ].map((option) => {
                            return (
                                <li
                                    key={option}
                                    onClick={handlePredefinedOptionChoice.bind(null, option)}
                                    className={`rounded-xl p-2 hover:bg-primary transition-all select-none cursor-pointer ${
                                        newPredefinedChoice === option ? "bg-card" : "bg-inherit"
                                    }`}
                                >
                                    {option}
                                </li>
                            );
                        })}
                    </ul>
                    <div className={"p-4 space-y-4"}>
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
                        <div className={"flex flex-row justify-end space-x-4"}>
                            <Button
                                onClick={handleCloseModal}
                                className={
                                    "bg-inherit text-primary-foreground border border-border"
                                }
                            >
                                <IoClose className={"w-6 h-6 mr-2"} />
                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmitInterval}
                                className={
                                    "bg-accent text-accent-foreground hover:bg-accent_light"
                                }
                            >
                                <IoCheckmark className={"w-6 h-6 mr-2"} />
                Confirm
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}