import Link from "next/link";
import MultiverseLogo from "@/app/layout/MultiverseLogo";
import { IoDocumentTextOutline } from "react-icons/io5";

import NavigationOptions from "@/app/layout/NavigationOptions";
import ThemePicker from "@/app/layout/ThemePicker";
import LoginOptions from "@/app/layout/LoginOptions";

export default function MainNav() {
    const pages = [
        {
            path: "/databases",
            title: "Databases",
        },
        {
            path: "/pricing",
            title: "Pricing",
        },
    ];

    return (
        <nav className="flex flex-row justify-between h-fit p-4 sticky top-0 z-50">
            <Link href={"/"} className="flex items-center w-fit">
                <MultiverseLogo logoOnly={true} />
            </Link>
            <div className="flex flex-1 flex-row mx-4">
                <NavigationOptions pages={pages} />
            </div>
            <div className="flex flex-row items-center">
                <Link href={"/docs"}>
                    <IoDocumentTextOutline className="w-6 h-6 text-foreground m-2.5" />
                </Link>
                <ThemePicker />
                <LoginOptions />
            </div>
        </nav>
    );
}