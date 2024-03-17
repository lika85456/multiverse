"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
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

type PredefinedOptions =
  | "today"
  | "last-week"
  | "last-month"
  | "last-year"
  | "custom";

export function DateIntervalPicker({ className, }: React.HTMLAttributes<HTMLDivElement>) {
    const [modalOpen, setModalOpen] = React.useState(false);
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: addDays(new Date(), -7),
        to: new Date(),
    });

    const [chosenOption, setChosenOption] =
    React.useState<PredefinedOptions>("custom");
    const [newDate, setNewDate] = React.useState<DateRange | undefined>({
        from: date?.from,
        to: date?.to,
    });

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSubmitInterval = () => {
        setDate(newDate);
        handleCloseModal();
    };

    const handlePredefinedOption = (option: PredefinedOptions) => {
        switch (option) {
        case "today":
            setNewDate({
                from: new Date(),
                to: new Date(),
            });
            break;
        case "last-week":
            setNewDate({
                from: addDays(new Date(), -7),
                to: new Date(),
            });
            break;
        case "last-month":
            setNewDate({
                from: addDays(new Date(), -30),
                to: new Date(),
            });
            break;
        case "last-year":
            setNewDate({
                from: addDays(new Date(), -365),
                to: new Date(),
            });
            break;
        case "custom":
            break;
        }
        setChosenOption(option);
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
                            onClick={handlePredefinedOption.bind(null, "today")}
                            className={`rounded ${
                                chosenOption === "today" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Today
                        </li>
                        <li
                            onClick={handlePredefinedOption.bind(null, "last-week")}
                            className={`rounded ${
                                chosenOption === "last-week" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Last Week
                        </li>
                        <li
                            onClick={handlePredefinedOption.bind(null, "last-month")}
                            className={`rounded ${
                                chosenOption === "last-month" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Last Month
                        </li>
                        <li
                            onClick={handlePredefinedOption.bind(null, "last-year")}
                            className={`rounded ${
                                chosenOption === "last-year" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Last Year
                        </li>
                        <li
                            onClick={handlePredefinedOption.bind(null, "custom")}
                            className={`rounded ${
                                chosenOption === "custom" ? "bg-card" : "bg-inherit"
                            }`}
                        >
              Custom
                        </li>
                    </ul>
                    <div className={"p-4"}>
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={newDate}
                            onSelect={(e) => {
                                handlePredefinedOption("custom");
                                setNewDate(e);
                            }}
                            numberOfMonths={2}
                            className={"bg-primary rounded-xl"}
                        />
                        <Button onClick={handleSubmitInterval}>Confirm</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}