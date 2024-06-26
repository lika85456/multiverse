import Image from "next/image";
import type { FC } from "react";
import logo from "/public/multiverse-logo.svg";

interface MultiverseLogoProps {
  withTitle?: boolean;
}

const MultiverseLogo: FC<MultiverseLogoProps> = ({ withTitle = true, }): JSX.Element => {
    return (
        <div className="flex items-center">
            <Image
                src={logo}
                alt="Multiverse Logo"
                className="w-11 h-11 text-foreground dark:invert"
            />
            <div className="flex items-center text-foreground">
                {withTitle && <h1 className="font-mono lowercase mx-4">multiverse</h1>}
            </div>
        </div>
    );
};

export default MultiverseLogo;