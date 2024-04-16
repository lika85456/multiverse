import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { ENV } from "@/lib/env";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb/mongodb";

export const authOptions = {
    // Configure one or more authentication providers
    providers: [
        GithubProvider({
            clientId: ENV.GITHUB_ID,
            clientSecret: ENV.GITHUB_SECRET,
        }),
        GoogleProvider({
            clientId: ENV.GOOGLE_ID,
            clientSecret: ENV.GOOGLE_SECRET,
        }),
    ],
    adapter: MongoDBAdapter(clientPromise),
    secret: ENV.SECRET_KEY,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };