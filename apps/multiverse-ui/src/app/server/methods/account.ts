import { publicProcedure } from "@/app/server/trpc";

export const accountMethods = {
    getAwsToken: publicProcedure.query(async() => {
        return {
            private: "token private",
            public: "token public",
            rsa256: "token rsa256",
        };
    }),
    removeAwsToken: publicProcedure.query(async() => {
        return {};
    }),
    addAwsToken: publicProcedure.query(async() => {
        return {};
    }),
};