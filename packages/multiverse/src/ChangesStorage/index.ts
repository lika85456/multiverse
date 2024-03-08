import { z } from "zod";
import { newVectorSchema } from "../Vector";

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

export default interface ChangesStorage {
    add(changes: StoredVectorChange[]): Promise<void>;
    changesAfter(timestamp: number): AsyncGenerator<StoredVectorChange, void, unknown>;

    deploy(): Promise<void>;
    destroy(): Promise<void>;
}