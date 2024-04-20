"use client";

import { Slider } from "@/components/ui/slider";
import SectionTitle from "@/app/layout/components/SectionTitle";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import format from "@/features/statistics/format";
import { customToast } from "@/features/fetching/CustomToast";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
    const [metadataPerVector, setMetadataPerVector] = useState(500);
    const [reads, setReads] = useState(10_000);
    const [writes, setWrites] = useState(10_000);

    const costs = calculateCost({
        dimensions,
        reads,
        writes,
        storedVectors,
        metadataPerVector,
    });

    const handleCopyCalculatedValues = async() => {
        try {
            const data = {
                storedVectors,
                reads,
                writes,
                dimensions,
                metadataPerVector,
                costs,
            };

            await navigator.clipboard.writeText(`${JSON.stringify(data)}`);
            customToast("Calculated values have been copied into your clipboard.");
        } catch (error) {
            customToast.error("Calculated values could not be copied.");
        }
    };

    const onDimensionsChange = (d: number | undefined) => {
        if (d === undefined) {
            setDimensions(1);

            return;
        }
        if (d <= 0) {
            d = 1;
        } else if (d > 10_000) {
            d = 10_000;
        }
        setDimensions(d);
    };

    const onMetadataChange = (m: number | undefined) => {
        if (m === undefined) {
            setMetadataPerVector(0);

            return;
        }
        if (m < 0) {
            m = 0;
        } else if (m > 1_000_000) {
            m = 1_000_000;
        }
        setMetadataPerVector(m);
    };

    return (
        <div className="flex flex-col pb-8">
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
            </ul>
            <div className="flex flex-row h-32 justify-between items-start space-x-4 select-none">
                <div>
                    <div className="flex flex-row justify-end space-x-4">
                        <div className="flex flex-col w-32">
                            <Label className="text-lg mb-4">Dimensions</Label>
                            <Input
                                type={"number"}
                                value={dimensions}
                                onChange={(e) => {
                                    onDimensionsChange(parseInt(e.target.value));
                                }}
                            />
                        </div>
                        <div className="flex flex-col w-64">
                            <Label className="text-lg mb-4">Metadata per vector (B)</Label>
                            <Input
                                type={"number"}
                                value={metadataPerVector}
                                onChange={(e) => {
                                    onMetadataChange(parseInt(e.target.value));
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col justify-end items-end text-end">
                    <div className="flex flex-row justify-end">
                        <div className="text-lg font-light capitalize">
                            Expected Total price:
                        </div>
                        <div className="ml-2 w-40 text-lg font-bold">{format(costs.totalCost)} $</div>
                    </div>
                    <Separator/>
                    <div className="text-md font-light text-tertiary">
                        <div className="flex flex-row justify-end">
                            <div className="capitalize">
                                DynamoDB:
                            </div>
                            <div className="ml-2 w-40 font-medium">{format(costs.dynamoCost)} $</div>
                        </div>
                        <div className="flex flex-row justify-end">
                            <div className="capitalize">
                                Lambda:
                            </div>
                            <div className="ml-2 w-40 font-medium">{format(costs.lambdaCost)} $</div>
                        </div>
                        <div className="flex flex-row justify-end">
                            <div className="capitalize">
                                S3 Storage:
                            </div>
                            <div className="ml-2 w-40 font-medium">{format(costs.s3Cost)} $</div>
                        </div>
                    </div>
                    <div className="text-sm font-thin text-tertiary">
                        * this price is a rough estimate and may not reflect the actual costs
                    </div>
                </div>
            </div>
        </div>
    );
}