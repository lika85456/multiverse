import { z } from "zod";
import { newVectorSchema } from "../core/Vector";

export const storedVectorChangeSchema = z.union([
    z.object({
        action: z.literal("add"),
        timestamp: z.number(),
        vector: newVectorSchema,
    }),
    z.object({
        action: z.literal("remove"),
        timestamp: z.number(),
        label: z.string(),
    }),
]);

export type StoredVectorChange = z.infer<typeof storedVectorChangeSchema>;