import DeleteVectorModal from "@/features/browser/DeleteVectorModal";
import ViewVectorModal from "@/features/browser/ViewVectorModal";

export interface QueryResultProps {
  label: string;
  metadata?: Record<string, string>
  vector: number[];
  resultDistance: number;
}

export default function QueryResult({ vector, codeName }: { vector: QueryResultProps, codeName: string }) {
    return (
        <div className="flex flex-row w-full h-9 justify-center items-center px-4 border-b border-border hover:bg-secondary transition-all">
            <div className="flex flex-row w-full justify-between items-center">
                <div className="w-32 text-primary-foreground truncate">
                    {vector.label}
                </div>
                <div className="text-secondary-foreground truncate">{`[${vector.vector
                    .slice(0, 10)
                    .map((element) => ` ${element.toFixed(3)}`)} ...]`}</div>
                <div className="flex justify-end w-16 text-primary-foreground">
                    {vector.resultDistance.toFixed(3)}
                </div>
            </div>
            <DeleteVectorModal label={vector.label} codeName={codeName} />
            <ViewVectorModal vector={{ ...vector }} />
        </div>
    );
}