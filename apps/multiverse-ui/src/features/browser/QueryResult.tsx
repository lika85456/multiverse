import DeleteVectorModal from "@/features/browser/DeleteVectorModal";

export interface QueryResultProps {
  id: string;
  label: string;
  metadata?: string;
  value: number[];
  metrics: number;
}

export default function QueryResult({ vector }: { vector: QueryResultProps }) {
    return (
        <div
            className={
                "flex flex-row w-full h-9 justify-center items-center px-4 border-b border-border hover:bg-secondary transition-all"
            }
        >
            <div className={"flex flex-row w-full justify-between items-center"}>
                <div className={"w-32 text-primary-foreground truncate"}>
                    {vector.label}
                </div>
                <div className={"text-secondary-foreground truncate"}>{`[${vector.value
                    .slice(0, 10)
                    .map((element) => ` ${element.toFixed(3)}`)} ...]`}</div>
                <div className={"flex justify-end w-16 text-primary-foreground"}>
                    {vector.metrics}
                </div>
            </div>
            <DeleteVectorModal id={vector.id} />
        </div>
    );
}