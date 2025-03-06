"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Database } from "@/server/procedures/database";

export default function DatabaseSectionNavigation({ database, }: {
  database: Database;
}) {
    const pathName = usePathname();

    let currentSection = "";
    if (pathName === `/databases/${database.codeName}`) {
        currentSection = "general";
    } else if (pathName === `/databases/${database.codeName}/statistics`) {
        currentSection = "statistics";
    } else if (pathName === `/databases/${database.codeName}/browser`) {
        currentSection = "browser";
    }

    return (
        <ul className="flex w-full h-11 justify-center items-center space-x-16">
            <li>
                <Link
                    href={`/databases/${database.codeName}`}
                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-light hover:underline hover:underline-offset-4 ${
                        currentSection === "general"
                            ? "underline underline-offset-4 text-primary-foreground"
                            : "text-secondary-foreground"
                    }`}
                >
          General
                </Link>
            </li>
            <li>
                <Link
                    href={`/databases/${database.codeName}/statistics`}
                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-light hover:underline hover:underline-offset-4 ${
                        currentSection === "statistics"
                            ? "underline underline-offset-4 text-primary-foreground"
                            : "text-secondary-foreground"
                    }`}
                >
          Statistics
                </Link>
            </li>
            <li>
                <Link
                    href={`/databases/${database.codeName}/browser`}
                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-light hover:underline hover:underline-offset-4 ${
                        currentSection === "browser"
                            ? "underline underline-offset-4 text-primary-foreground"
                            : "text-secondary-foreground"
                    }`}
                >
          Browser
                </Link>
            </li>
        </ul>
    );
}