import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import * as React from "react";
import { DbsToCreate, DbsToDelete } from "@/app/(auth-required)/databases/components/DatabaseList";

export default async function Home() {

    const session = await getServerSession(authOptions);

    // TODO - create overview page
    return <div>
        <DbsToCreate dbsToCreate={["db1", "db2"]} />
        <DbsToDelete dbsToDelete={["db3", "db4"]} />
        {
            JSON.stringify(session, null, 4)
        }
    </div>;
}