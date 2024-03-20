"use client";

import { Slider } from "@/components/ui/slider";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import format from "@/features/statistics/format";

function ParameterSlider({
    slider: {
        label, min, max, formatValue
    },
    onChange,
}: {
  slider: {
    label: string;
    min: number;
    max: number;
    formatValue: (value: number) => string;
  };
  onChange: (value: number) => void;
}) {
    const [value, setValue] = useState((max + min) / 2);

    const handleValueChange = (value: number[]) => {
        setValue(value[0]);
        onChange(value[0]);
    };

    //TODO use logarithmic or more suitable scale for the slider
    //TODO make value on the side an input field
    return (
        <div className="flex flex-col w-full items-start my-16">
            <Label className="text-lg mb-4">{label}</Label>
            <div className="flex flex-row w-full h-fit py-4">
                <Slider
                    value={[value]}
                    min={min}
                    max={max}
                    step={1}
                    onValueChange={(value) => handleValueChange(value)}
                />
                <div className="flex w-24 ml-4 justify-end">
                    {formatValue(value).replace(" ", "")}
                </div>
            </div>
        </div>
    );
}

export default function PriceCalculator() {
    const sliders = [
        {
            label: "Data size",
            parameter: 1,
            min: 100000,
            max: 10000000000000,
            formatValue: (value: number) => {
                return `${format(value, "bytes")}`;
            },
        },
        {
            label: "Queries",
            parameter: 1,
            min: 100000,
            max: 1000000,
            formatValue: (value: number) => {
                return `${format(value, "compact")}`;
            },
        },
        {
            label: "Writes",
            parameter: 1,
            min: 100000,
            max: 1000000,
            formatValue: (value: number) => {
                return `${format(value, "compact")}`;
            },
        },
    ];

    const defaultValues = sliders.map((slider) => {
        return {
            value: (slider.max + slider.min) / 2,
            parameter: slider.parameter,
        };
    });

    const [values, setValues] = useState(defaultValues);

    const handleOnChange = (value: number, sliderIndex: number) => {
        const newValues = [...values];
        newValues[sliderIndex] = {
            value,
            parameter: sliders[sliderIndex].parameter,
        };
        setValues(newValues);
    };

    const totalPrice = values.reduce((acc, value) => {
        return acc + value.value * value.parameter;
    }, 0);

    const handleCopyCalculatedValues = async() => {
        try {
            const data = {
                parameters: sliders.map((slider, index) => {
                    return {
                        label: slider.label,
                        value: values[index].value,
                    };
                }),
                totalPrice: totalPrice,
            };

            await navigator.clipboard.writeText(`${JSON.stringify(data)}`);
            toast("Calculated values have been copied into your clipboard.");
        } catch (error) {
            console.log("Calculated values could not be copied.");
        }
    };

    return (
        <div className="flex flex-col pb-16">
            <div className="flex flex-row justify-between items-center">
                <SectionTitle title={"Price calculator"} className="flex h-fit" />

                <Button
                    onClick={handleCopyCalculatedValues}
                    className="border-0 bg-inherit hover:text-secondary-foreground p-0"
                >
                    <CopyIcon className="w-6 h-6 mr-2 cursor-pointer" /> Copy calculated
          values
                </Button>
            </div>
            <ul>
                {sliders.map((slider, index) => (
                    <ParameterSlider
                        key={index}
                        slider={slider}
                        onChange={(value) => handleOnChange(value, index)}
                    />
                ))}
            </ul>
            <div className="flex flex-row h-fit justify-end items-center space-x-4">
                <div className="flex flex-row space-x-4 items-center">
                    <div className="text-lg font-thin capitalize">
            Expected Total price:
                    </div>
                    <div className="text-lg font-medium">{totalPrice} $</div>
                </div>
            </div>
        </div>
    );
}