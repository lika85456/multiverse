import OAuthProvider from "@/features/login/OAuthProvider";
import {
    FaGoogle, FaAws, FaGithub
} from "react-icons/fa";

export default function OAuthOptions() {
    return (
        <ul className="flex flex-row justify-center">
            <li className="px-4">
                <OAuthProvider>
                    <FaGoogle className="w-9 h-9" />
                </OAuthProvider>
            </li>
            <li className="px-4">
                <OAuthProvider>
                    <FaAws className="w-11 h-11" />
                </OAuthProvider>
            </li>
            <li className="px-4">
                <OAuthProvider>
                    <FaGithub className="w-9 h-9" />
                </OAuthProvider>
            </li>
        </ul>
    );
}