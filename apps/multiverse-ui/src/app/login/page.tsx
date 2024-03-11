import AuthOptions from "@/features/login/AuthOptions";

export default function LoginPage() {
    return (
        <div className={"flex flex-1 flex-col w-full h-full items-center"}>
            <div className="pt-32">
                <AuthOptions />
            </div>
        </div>
    );
}