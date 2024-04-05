import AuthOptions from "@/features/login/AuthOptions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

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