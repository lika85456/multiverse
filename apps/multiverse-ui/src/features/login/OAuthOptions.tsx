import OAuthProvider from "@/features/login/OAuthProvider";
import { FaGoogle, FaGithub, } from "react-icons/fa";

export default function OAuthOptions() {
    return (
        <ul className="flex flex-row justify-center">
            <li className="px-4">
                <OAuthProvider provider={"google"}>
                    <FaGoogle className="w-9 h-9" />
                </OAuthProvider>
            </li>
            <li className="px-4">
                <OAuthProvider provider={"github"}>
                    <FaGithub className="w-9 h-9" />
                </OAuthProvider>
            </li>
        </ul>
    );
}