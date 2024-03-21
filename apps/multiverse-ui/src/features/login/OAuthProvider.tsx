"use client";

import { signIn } from "next-auth/react";
import type { ReactNode } from "react";

export default function OAuthProvider({
    children,
    provider,
}: Readonly<{
  children: ReactNode;
  provider: "google" | "aws" | "github";
}>) {
    const handleAuthenticate = async() => {
        try {
            await signIn(provider, { callbackUrl: "/" }).catch(console.error);
        } catch (error) {
            // console.error("Could not authenticate with the provider", error);
        }
    };

    return (
        <button
            className="flex w-16 h-16 bg-[#e6e6e6] hover:bg-[#b3b3b3] text-[#1a1a1a] rounded-md justify-center items-center transition-all"
            onClick={handleAuthenticate}
        >
            {children}
        </button>
    );
}