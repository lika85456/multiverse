"use client";

import { IoAdd } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import useModal from "@/features/modals/use-modal";

export default function UpsertVectorModal({ className, }: {
  className?: string;
}) {
    const {
        modalOpen, handleOpenModal, handleCloseModal
    } = useModal();

    return (
        <div className={className}>
            <Button
                className={
                    "self-end bg-accent text-accent-foreground hover:bg-accent_light"
                }
            >
                <IoAdd className={"w-6 h-6 mr-2"} />
        Upsert
            </Button>
        </div>
    );
}