import EmailInput from "@/features/login/EmailInput";
import OAuthOptions from "@/features/login/OAuthOptions";

export default function LoginOptions() {
    return (
        <div className="flex flex-col w-96">
            <h1 className="flex justify-center text-foreground text-2xl font-bold py-4">
        Sign in
            </h1>
            <h2 className="flex justify-center text-xl p-2">SSO</h2>
            <EmailInput />
            <h2 className="flex justify-center text-xl p-2">or</h2>
            <OAuthOptions />
        </div>
    );
}