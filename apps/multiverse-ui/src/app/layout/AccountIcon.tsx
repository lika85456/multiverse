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
import { signOut } from "next-auth/react";
import { toast } from "sonner";

export default function AccountIcon({ user, }: {
  user:
    | {
        name?: string | null | undefined;
        email?: string | null | undefined;
        image?: string | null | undefined;
      }
    | undefined;
}) {
    const currentPath = usePathname();
    // const router = useRouter();

    const handleLogOut = async() => {
        try {
            await signOut({ callbackUrl: "/login", });
        } catch (error) {
            toast("Could not log out. Please try again later.");
        }
    };

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
                        {user?.image && <AvatarImage src={user.image} alt="User's profile image"/>}
                        {!user?.image && (
                            <AvatarFallback className="text-contrast_primary-foreground bg-contrast_primary uppercase">
                                {user?.name?.at(0) ?? "U"}
                            </AvatarFallback>
                        )}
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card text-card-foreground border-0 mr-4 mt-1">
                    <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <Link href={"/account"}>
                        <DropdownMenuItem className="font-bold focus:bg-primary focus:text-primary-foreground">
                            <FiUser className="mr-2 h-4 w-4" />
              Account
                        </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                        className="focus:bg-primary focus:text-primary-foreground"
                        onClick={handleLogOut}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}