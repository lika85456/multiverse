import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { ENV } from "@/lib/env";
import clientPromise from "@/lib/mongodb/mongodb";
import type { AuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { Adapter } from "next-auth/adapters";

export const authOptions: AuthOptions = {
    // Configure one or more authentication providers
    providers: [
        Github({
            clientId: ENV.GITHUB_ID,
            clientSecret: ENV.GITHUB_SECRET,
        }),
        Google({
            clientId: ENV.GOOGLE_ID,
            clientSecret: ENV.GOOGLE_SECRET,
        }),
        Email({
            server: `smtp://${ENV.SMTP_USER}:${ENV.SMTP_PASSWORD}@${ENV.SMTP_HOST}:${ENV.SMTP_PORT}`,
            from: ENV.EMAIL_FROM,
            // maxAge: 24 * 60 * 60,
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;

            return baseUrl;
        },
    },
    adapter: MongoDBAdapter(clientPromise) as Adapter,
    secret: ENV.SECRET_KEY,
};