import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import { changeUserAcceptedCostsGeneration, getSessionUser } from "@/lib/mongodb/collections/user";
import { TRPCError } from "@trpc/server";
import { handleError } from "@/server";

export const costGenerator = router({
    get: publicProcedure.query(async(): Promise<{enabled: boolean}> => {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Unauthorized",
            });
        }

        return { enabled: sessionUser.acceptedCostsGeneration };
    }),
    update: publicProcedure.input(z.boolean()).mutation(async(opts): Promise<{enabled: boolean}> => {
        try {
            const sessionUser = await getSessionUser();
            if (!sessionUser) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Unauthorized",
                });
            }

            const result = await changeUserAcceptedCostsGeneration(sessionUser._id, opts.input);

            return { enabled: result };
        } catch (error) {
            throw handleError({
                error,
                errorMessage: "Error while updating cost generation acceptance status",
            });
        }
    }),
});