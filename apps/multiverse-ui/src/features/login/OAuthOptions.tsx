import OAuthProvider from "@/features/login/OAuthProvider";

export default function OAuthOptions() {
    return (
        <ul className="flex flex-row justify-center">
            <li className="px-4">
                <OAuthProvider>Google</OAuthProvider>
            </li>
            <li className="px-4">
                <OAuthProvider>AWS</OAuthProvider>
            </li>
            <li className="px-4">
                <OAuthProvider>GitHub</OAuthProvider>
            </li>
        </ul>
    );
}