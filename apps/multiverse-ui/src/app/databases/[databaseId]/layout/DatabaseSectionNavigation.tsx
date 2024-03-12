"use client";

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuIndicator,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
    NavigationMenuViewport,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getDatabaseById } from "@/features/database/dummy-databases";
import Page404 from "@/app/not-found";

export default function DatabaseSectionNavigation() {
    const params = useParams();
    const pathName = usePathname();
    const databaseId = params.databaseId as string;
    const database = getDatabaseById(databaseId);

    if (!database) return Page404();

    let currentSection = "";
    if (pathName === `/databases/${databaseId}`) {
        currentSection = "general";
    } else if (pathName === `/databases/${databaseId}/statistics`) {
        currentSection = "statistics";
    } else if (pathName === `/databases/${databaseId}/browser`) {
        currentSection = "browser";
    }
    console.log(currentSection);

    return (
        <ul className={"flex w-full h-11 justify-center items-center space-x-16"}>
            <li className={""}>
                <Link
                    href={`/databases/${databaseId}`}
                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
                        currentSection === "general"
                            ? "underline underline-offset-4 text-primary-foreground"
                            : "text-secondary-foreground"
                    }`}
                >
          General
                </Link>
            </li>
            <li className={""}>
                <Link
                    href={`/databases/${databaseId}/statistics`}
                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
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
                    href={`/databases/${databaseId}/browser`}
                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
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