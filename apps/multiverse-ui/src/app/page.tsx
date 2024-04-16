import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Loading from "@/features/fetching/Loading";
import GeneralError from "@/features/fetching/GeneralError";
import * as React from "react";

export default async function Home() {

    const session = await getServerSession(authOptions);

    return <div>
        <Loading/>
        <GeneralError/>
        {
            JSON.stringify(session, null, 4)
        }
    </div>;
}