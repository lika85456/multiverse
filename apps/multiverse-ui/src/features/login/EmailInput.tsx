"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IoArrowForward } from "react-icons/io5";
import { useRouter } from "next/navigation";

export default function EmailInput() {
    const router = useRouter();

    return (
        <div className="flex w-full max-w-sm items-center ">
            <Input
                type="email"
                placeholder="email@example.com"
                className="rounded-r-none border-r-0"
            />
            <Button
                type="submit"
                className="rounded-l-none bg-accent text-primary hover:bg-accent_light"
                onClick={() => router.push("/")}
            >
                <IoArrowForward className="w-6 h-6 text-accent-foreground" />
            </Button>
        </div>
    );
}