import { ENV } from "@/lib/env";
import { redirect } from "next/navigation";

export default function Docs() {
    redirect(ENV.DOCS_URL); // to not throw 404, better UX
}