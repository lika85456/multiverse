import { getServerSession } from "next-auth";
import * as React from "react";
import { DbsToCreate, DbsToDelete } from "@/app/(auth-required)/databases/components/DatabaseList";
import { authOptions } from "@/lib/auth/auth";

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