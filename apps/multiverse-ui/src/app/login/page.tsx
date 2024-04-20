import AuthOptions from "@/features/login/AuthOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

export default async function LoginPage() {
    const session = await getServerSession(authOptions);
    if (session?.user) {
        return redirect("/");
    }

    return (
        <div className="pt-32">
            <AuthOptions />
        </div>
    );
}