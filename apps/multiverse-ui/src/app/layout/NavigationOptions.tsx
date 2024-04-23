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
    newTab: boolean;
  }[];
}

export default function NavigationOptions({ pages }: NavigationOptionsProps) {
    const pathName = usePathname();

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {pages.map((page) => {
                    return (
                        <NavigationMenuItem key={page.path}>
                            {!page.newTab && <Link href={page.path} legacyBehavior passHref>
                                <NavigationMenuLink
                                    className={`text-sm tracking-[0.2rem] px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
                                        pathName.includes(page.path)
                                            ? "underline underline-offset-4 text-primary-foreground"
                                            : "text-secondary-foreground"
                                    }`}
                                >
                                    {page.title}
                                </NavigationMenuLink>
                            </Link>}
                            {page.newTab && <a
                                href={page.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm tracking-[0.2rem] px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
                                    pathName.includes(page.path)
                                        ? "underline underline-offset-4 text-primary-foreground"
                                        : "text-secondary-foreground"
                                }`}>{page.title}</a>}
                        </NavigationMenuItem>
                    );
                })}
            </NavigationMenuList>
        </NavigationMenu>
    );
}