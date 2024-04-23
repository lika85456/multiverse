import GithubProvider from "next-auth/providers/github";
import { ENV } from "@/lib/env";
import GoogleProvider from "next-auth/providers/google";
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
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allows callback URLs on the same origin
        else if (new URL(url).origin === baseUrl) return url;

        return baseUrl;
    },
    adapter: MongoDBAdapter(clientPromise),
    secret: ENV.SECRET_KEY,
};