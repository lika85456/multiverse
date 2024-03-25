"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IoArrowForward } from "react-icons/io5";
import { signIn } from "next-auth/react";
import { useState } from "react";
// import z from "zod";
import { useRouter } from "next/navigation";

export default function EmailInput() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [wasFocused, setWasFocused] = useState(false);

    // const email = z.string().email({ message: "Invalid email address" });

    const handleOnChange = (value: string) => {
        if (value.length === 0 || !value.includes("@") || !value.includes(".")) {
            setButtonDisabled(true);
        } else {
            setButtonDisabled(false);
        }
        setEmail(value);
    };

    return (
        <div className="flex w-full max-w-sm items-center ">
            <Input
                type="email"
                placeholder="email@example.com"
                className={`rounded-r-none border-r-0 ${
                    buttonDisabled && wasFocused ? "border-destructive" : ""
                }`}
                onChange={(e) => handleOnChange(e.target.value)}
                onBlur={() => setWasFocused(true)}
            />
            <Button
                disabled={buttonDisabled}
                type="submit"
                className={
                    "rounded-l-none bg-accent text-primary hover:bg-accent_light"
                }
                onClick={() => signIn("email", { email })}
            >
                <IoArrowForward className="w-6 h-6 text-accent-foreground" />
            </Button>
        </div>
    );
}