"use client";

import { usePathname } from "next/navigation";
import {
    Avatar, AvatarFallback, AvatarImage
} from "@/components/ui/avatar";

export default function AccountIcon() {
    const params = usePathname();
    const isHighlighted = params === "/account";

    const userInitial = "M";

    const userImage =
    "https://e7.pngegg.com/pngimages/178/595/png-clipart-user-profile-computer-icons-login-user-avatars-monochromes-black.png";

    const optionsHandler = () => {
        console.log("Options");
    };

    return (
        <Avatar
            className={`mx-1.5 ${isHighlighted ? "border-2 border-foreground" : ""}`}
            onClick={() => optionsHandler()}
        >
            <AvatarImage src={userImage} alt="@shadcn" />
            <AvatarFallback className={"text-accent-foreground bg-accent_light"}>
                {userInitial}
            </AvatarFallback>
        </Avatar>
    );
}