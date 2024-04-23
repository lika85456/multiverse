import Link from "next/link";
import MultiverseLogo from "@/app/layout/MultiverseLogo";

import NavigationOptions from "@/app/layout/NavigationOptions";
import ThemePicker from "@/app/layout/ThemePicker";
import LoginOptions from "@/app/layout/LoginOptions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { ENV } from "@/lib/env";

export default async function MainNav() {
    const session = await getServerSession(authOptions);

    const pages = [
        {
            path: "/databases",
            title: "Databases",
            requiredAuth: true,
            newTab: false,
        },
        {
            path: "/pricing",
            title: "Pricing",
            requiredAuth: false,
            newTab: false,
        },
        {
            path: ENV.DOCS_URL,
            title: "Docs",
            requiredAuth: false,
            newTab: true,
        },
    ];

    return (
        <nav className="flex flex-row justify-between h-fit p-4 sticky top-0 z-50 backdrop-blur-sm">
            <Link href={"/"} className="flex items-center w-fit">
                <MultiverseLogo />
            </Link>
            <div className="flex flex-1 flex-row mx-4">
                <NavigationOptions
                    pages={pages.filter((item) => {
                        return !item.requiredAuth || !!session?.user;
                    })}
                />
            </div>
            <div className="flex flex-row items-center">
                {/*<Link href={"/docs"}>*/}
                {/*    <IoDocumentTextOutline className="w-6 h-6 text-foreground m-2.5" />*/}
                {/*</Link>*/}
                <ThemePicker />
                <LoginOptions user={session?.user} />
            </div>
        </nav>
    );
}