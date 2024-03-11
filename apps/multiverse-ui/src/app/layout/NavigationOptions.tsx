"use client";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavigationOptionsProps {
  pages: {
    path: string;
    title: string;
    requiredAuth: boolean;
  }[];
}

export default function NavigationOptions({ pages }: NavigationOptionsProps) {
    const pathName = usePathname();

    const authenticated = true;

    const filteredPages = pages.filter((item) => {
        return item.requiredAuth || authenticated;
    });

    const pagesItems = filteredPages.map((page) => {
        return (
            <NavigationMenuItem key={page.path}>
                <Link href={page.path} legacyBehavior passHref>
                    <NavigationMenuLink
                        className={`px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
                            pathName.includes(page.path)
                                ? "underline underline-offset-4 text-primary-foreground"
                                : "text-secondary-foreground"
                        }`}
                    >
                        {page.title}
                    </NavigationMenuLink>
                </Link>
            </NavigationMenuItem>
        );
    });

    return (
        <NavigationMenu>
            <NavigationMenuList>{pagesItems}</NavigationMenuList>
        </NavigationMenu>
    );
}