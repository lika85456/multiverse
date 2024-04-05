import VectorQuery from "@/features/browser/VectorQuery";
import UpsertVectorModal from "@/features/browser/UpsertVectorModal";

export default function DatabaseBrowser() {

    return (
        <div className="flex flex-col justify-center items-start space-y-4">
            <UpsertVectorModal className="self-end" />
            <VectorQuery />
        </div>
    );
}