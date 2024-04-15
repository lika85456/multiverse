"use client";

import { Slider } from "@/components/ui/slider";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import format from "@/features/statistics/format";

function calculateCost({
    writes,
    reads,
    storedVectors,
    dimensions,
    metadataPerVector = 500,
}: {
  writes: number;
  reads: number;
  storedVectors: number;
  dimensions: number;
  metadataPerVector?: number;
}) {
    const bytesPerVector = metadataPerVector + dimensions * 4; // 500 bytes for metadata, 4 bytes per dimension

    /**
   * DynamoDB costs
   */

    // one read unit is 4KB
    const DYNAMO_READ_UNIT_COST = 0.25 / 1_000_000; // $0.25 per million reads
    // one write unit is 1KB
    const DYNAMO_WRITE_UNIT_COST = 1.25 / 1_000_000; // $1.25 per million writes
    const DYNAMO_STORAGE_COST = 0.25 / 1_000_000_000; // $0.25 per GB per month

    const readUnitsPerVector = Math.ceil(bytesPerVector / 4_000);
    const writeUnitsPerVector = Math.ceil(bytesPerVector / 1_000);

    const dynamoCost =
    /** READS */
    // every read costs 1 read from dynamo of newly written vectors (amount is writes/reads)
    (writes / reads) * readUnitsPerVector * DYNAMO_READ_UNIT_COST +
    // it also costs one additional read for infrastructure
    reads * DYNAMO_READ_UNIT_COST +
    // it also costs one write for updating infrastructure
    reads * DYNAMO_WRITE_UNIT_COST +
    /** WRITES */
    writes * writeUnitsPerVector * DYNAMO_WRITE_UNIT_COST +
    // it also costs one additional read for infrastructure
    writes * DYNAMO_READ_UNIT_COST +
    // it also costs one write for updating infrastructure
    writes * DYNAMO_WRITE_UNIT_COST +
    /** STORAGE */
    // each vector has lifetime of 1 day until it's permanently indexed into S3 and deleted from dynamo
    // that means we have to pay for 1 day of storage for each vector and also one write and read for TTL operations
    (storedVectors * bytesPerVector * DYNAMO_STORAGE_COST) / 30 +
    storedVectors * readUnitsPerVector * DYNAMO_READ_UNIT_COST +
    storedVectors * writeUnitsPerVector * DYNAMO_WRITE_UNIT_COST;

    /**
   * S3 costs
   */
    const S3_STORAGE_COST = 0.025 / 1_000_000_000; // $0.025 per GB per month
    const s3Cost = storedVectors * bytesPerVector * S3_STORAGE_COST;

    /**
   * Lambda costs
   */
    const LAMBDA_RAM_GB_PER_MS = 0.0000166667 / 1000; // $0.0000000166667 per GB per ms
    const LAMBDA_DISK_GB_PER_MS = 0.0000000367 / 1000; // $0.0000000000367 per GB per ms
    const LAMBDA_INVOKE_COST = 0.2 / 1_000_000; // $0.20 per 1M invocations

    const PARTITION_SIZE = 8_000_000_000; // 8GB is maximum partition size
    const partitions = (storedVectors * bytesPerVector) / PARTITION_SIZE;

    const poolLambdaRamPerMs =
    (Math.max(storedVectors * bytesPerVector, 256_000_000) *
      LAMBDA_RAM_GB_PER_MS) /
    1_000_000_000; // min 256MB
    const poolLambdaDiskPerMs =
    (Math.max(storedVectors * bytesPerVector, 512_000_000) *
      LAMBDA_DISK_GB_PER_MS) /
    1_000_000_000; // min 512MB - its free up to 512, but for the simplicity we "pay" it here.

    const COMPUTE_TIME = 20;

    const lambdaCost =
    // invocations
    (writes + reads) * LAMBDA_INVOKE_COST * (partitions + 1) +
    // reads
    reads * poolLambdaRamPerMs * COMPUTE_TIME +
    reads * poolLambdaDiskPerMs * COMPUTE_TIME;
    // writes do not need to be calculated, because they are included in reads

    // console.log({
    //     dynamoCost,
    //     s3Cost,
    //     lambdaCost,
    // });

    return {
        dynamoCost,
        s3Cost,
        lambdaCost,
        totalCost: dynamoCost + s3Cost + lambdaCost
    };
}

function CalculatorSlider({
    label,
    min,
    max,
    value,
    formatValue,
    logarithmic,
    onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  formatValue: (value: number) => string;
  logarithmic?: boolean;
  onChange: (value: number) => void;
}) {
    //TODO make value on the side an input field
    return (
        <div className="flex flex-col w-full items-start my-8">
            <Label className="text-lg mb-4">{label}</Label>
            <div className="flex flex-row w-full h-fit">
                <Slider
                    value={[logarithmic ? Math.log(value) : value]}
                    min={min}
                    max={max}
                    step={0.001}
                    onValueChange={(value) => onChange(value[0])}
                />
                <div className="flex w-24 ml-4 justify-end">{formatValue(value)}</div>
            </div>
        </div>
    );
}

export default function PriceCalculator() {
    const [storedVectors, setStoredVectors] = useState(100_000);
    const [dimensions, setDimensions] = useState(1536);
    const [reads, setReads] = useState(10_000);
    const [writes, setWrites] = useState(10_000);

    const costs = calculateCost({
        dimensions,
        reads,
        writes,
        storedVectors,
    });

    const handleCopyCalculatedValues = async() => {
        try {
            const data = {
                storedVectors: storedVectors,
                reads: reads,
                writes: writes,
                dimensions: dimensions,
                costs: costs,
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
                <CalculatorSlider
                    label="Stored vectors"
                    min={0}
                    max={Math.log(1_000_000_000)}
                    value={storedVectors}
                    onChange={(value) =>
                        setStoredVectors(Math.ceil(Math.pow(Math.E, value)))
                    }
                    formatValue={(v) => format(v, "compact")}
                    logarithmic
                />
                <CalculatorSlider
                    label="Reads per month"
                    min={0}
                    max={Math.log(1_000_000_000)}
                    value={reads}
                    onChange={(value) => setReads(Math.ceil(Math.pow(Math.E, value)))}
                    formatValue={(v) => format(v, "compact")}
                    logarithmic
                />
                <CalculatorSlider
                    label="Writes per month"
                    min={0}
                    max={Math.log(1_000_000_000)}
                    value={writes}
                    onChange={(value) => setWrites(Math.ceil(Math.pow(Math.E, value)))}
                    formatValue={(v) => format(v, "compact")}
                    logarithmic
                />
                <CalculatorSlider
                    label="Dimensions"
                    min={0}
                    max={Math.log(10_000)}
                    value={dimensions}
                    onChange={(value) =>
                        setDimensions(Math.ceil(Math.pow(Math.E, value)))
                    }
                    formatValue={(v) => format(v)}
                    logarithmic
                />
            </ul>
            <div className="flex flex-row h-fit justify-end items-center space-x-4">
                <div className="flex flex-row space-x-4 items-center">
                    <div className="text-lg font-thin capitalize">
            Expected Total price:
                    </div>
                    <div className="text-lg font-medium">{format(costs.totalCost)} $</div>
                </div>
            </div>
        </div>
    );
}