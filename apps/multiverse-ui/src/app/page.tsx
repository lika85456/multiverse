import * as React from "react";
import PageTitle from "@/app/layout/components/PageTitle";
import SectionTitle from "@/app/layout/components/SectionTitle";

export default async function Home() {

    // TODO - create overview page
    return <div className="flex flex-col 2xl:mx-96">
        <PageTitle title={"Welcome to Multiverse"}/>
        <p className="mb-8 text-secondary-foreground">
            Dive into the world of vector databases.
        </p>
        <SectionTitle title={"Serverless vector databases"}/>
        <p className="mb-8 text-secondary-foreground">
            Use serverless databases to store your data and query it with ease. Multiverse is a platform that allows you
            to create and manage your own databases. You can create as many databases as you want and use them to store your data.
        </p>
        <SectionTitle title={"Getting started"}/>
        <p className="mb-8 text-secondary-foreground">
            To get started, you need to create an account. After creating an account, you can create your first database.
            To create a database, you need to provide an AWS Token. The token is used to create and manage your databases,
            right inside your AWS account. You can find out more on our <a className="text-contrast_primary" href="/docs">documentation</a> page.
        </p>
        <SectionTitle title={"Pricing"}/>
        <p className="mb-8 text-secondary-foreground">
            By running on the AWS infrastructure, Multiverse can provide you with a cost-effective solution. You pay only
            once inside your AWS account, for the resources you use. Multiverse does not charge you for the service itself.
        </p>
    </div>;
}