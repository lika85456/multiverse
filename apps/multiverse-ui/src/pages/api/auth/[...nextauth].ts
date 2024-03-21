import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { ENV } from "@/lib/env";

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
    // ...add more providers here
    ],
    strategy: "jwt",
};
export default NextAuth(authOptions);