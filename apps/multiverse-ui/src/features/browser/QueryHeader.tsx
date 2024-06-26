import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IoArrowForward } from "react-icons/io5";
import { CopyIcon } from "lucide-react";
import { useState } from "react";
import { customToast } from "@/features/fetching/CustomToast";

export type VectorValues = number[];

export interface VectorQueryProps {
  dimensions: number;
  onRunQuery: (vector: VectorValues, k: number) => void;
  onCopyRequest: (vector: VectorValues, k: number) => void;
}

export default function QueryHeader({
    dimensions,
    onRunQuery,
    onCopyRequest,
}: VectorQueryProps) {
    const [providedStringVector, setProvidedStringVector] = useState<string>(`[${new Array(dimensions).fill(0).map(() => "0.000")}]`,);
    const [isValid, setIsValid] = useState<boolean>(true);
    const [vector, setVector] = useState<VectorValues>(new Array(dimensions).fill(0));
    const [k, setK] = useState(30);
    const handleRunQuery = () => {
        try {
            const vector = JSON.parse(providedStringVector.toString(),) as VectorValues;
            // console.log("Running query with vector", vector, "and k", k);
            onRunQuery(vector, k);
        } catch (e) {
            customToast.error("Invalid vector format.");

            return;
        }
    };

    const transformToVector = (stringVector: string) => {
        try {
            const vectorValue = JSON.parse(stringVector) as VectorValues;
            if (vectorValue.length === dimensions) {
                setVector(vectorValue);
                setIsValid(true);
            } else {
                setIsValid(false);
            }
        } catch (e) {
            setIsValid(false);
        }
    };

    const handleOnChangeVector = (e: string) => {
        setProvidedStringVector(e);
        transformToVector(e);
    };

    const handleCopyRequest = async() => {
        try {
            onCopyRequest(vector, k);
        } catch (e) {
            customToast.error("Invalid vector format.");

            return;
        }
    };

    return (
        <div className="flex flex-row w-full space-x-4">
            <div className="flex flex-row w-full">
                <Input
                    placeholder={
                        "[0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000 ... ] "
                    }
                    defaultValue={providedStringVector}
                    onChange={(e) => handleOnChangeVector(e.target.value)}
                    className="flex w-full rounded-r-none"
                />
                <div className="flex flex-row w-fit border items-center px-2">
          k:
                    <Input
                        placeholder={"30"}
                        type={"number"}
                        defaultValue={k}
                        onChange={(e) => setK(parseInt(e.target.value))}
                        className="h-fit border-0 focus:border-0 focus:outline-0"
                    />
                </div>
                <Button
                    disabled={!isValid}
                    className="rounded-l-none bg-accent hover:bg-accent_light text-accent-foreground"
                    onClick={handleRunQuery}
                >
          Run query
                    <IoArrowForward className="w-6 h-6 ml-2" />
                </Button>
            </div>
            <Button
                disabled={!isValid}
                className="flex flex-row w-fit hover:text-secondary-foreground"
                onClick={handleCopyRequest}
            >
                <CopyIcon className="w-6 h-6 mr-2" />
        Copy query request
            </Button>
        </div>
    );
}