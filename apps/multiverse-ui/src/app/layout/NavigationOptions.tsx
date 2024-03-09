"use client";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import type { FC } from "react";
import { usePathname } from "next/navigation";

export interface NavigationOptionsProps {
  pages: {
    path: string;
    title: string;
  }[];
}

const NavigationOptions: FC<NavigationOptionsProps> = ({ pages }) => {
    const pathName = usePathname();
    const pagesItems = pages.map((item) => {
        return (
            <NavigationMenuItem key={item.path}>
                <Link href={item.path} legacyBehavior passHref>
                    <NavigationMenuLink
                        className={`px-4 uppercase font-thin hover:underline hover:underline-offset-4 ${
                            item.path === pathName
                                ? "underline underline-offset-4 text-primary-foreground"
                                : "text-secondary-foreground"
                        }`}
                    >
                        {item.title}
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
};

export default NavigationOptions;