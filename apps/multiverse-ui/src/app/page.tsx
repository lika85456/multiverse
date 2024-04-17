import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import * as React from "react";

export default async function Home() {

    const session = await getServerSession(authOptions);

    // TODO - create overview page
    return <div>
        {
            JSON.stringify(session, null, 4)
        }
    </div>;
}