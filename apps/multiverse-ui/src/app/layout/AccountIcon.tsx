"use client";

import { usePathname } from "next/navigation";
import {
    Avatar, AvatarFallback, AvatarImage
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { FiUser } from "react-icons/fi";

export default function AccountIcon() {
    const currentPath = usePathname();

    const userName = "Michal Kornúc";
    const userInitial = userName.length > 0 ? userName.at(0)?.toUpperCase() : "U";
    const userImage =
    "https://e7.pngegg.com/pngimages/178/595/png-clipart-user-profile-computer-icons-login-user-avatars-monochromes-black.png";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Avatar
                        className={`mx-1.5 ${
                            currentPath.includes("/account")
                                ? "border-2 border-foreground"
                                : ""
                        }`}
                    >
                        <AvatarImage src={userImage} alt="@shadcn" />
                        <AvatarFallback
                            className={"text-contrast_primary-foreground bg-contrast_primary"}
                        >
                            {userInitial}
                        </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className={"bg-card text-card-foreground border-0 mr-4 mt-1"}
                >
                    <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                    <DropdownMenuSeparator className={"bg-border"} />
                    <Link href={"/account"}>
                        <DropdownMenuItem
                            className={
                                "font-bold focus:bg-primary focus:text-primary-foreground"
                            }
                        >
                            <FiUser className={"mr-2 h-4 w-4"} />
              Account
                        </DropdownMenuItem>
                    </Link>
                    {/*<DropdownMenuSeparator className={"bg-border"} />*/}
                    <Link
                        href={"/login"}
                        onClick={() => {
                            console.log("Logging out");
                        }}
                    >
                        <DropdownMenuItem
                            className={"focus:bg-primary focus:text-primary-foreground"}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </Link>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}