import { z } from "zod";

// PUBLIC API
export const querySchema = z.object({
    vector: z.array(z.number()),
    k: z.number(),
    metadataExpression: z.string().optional(),
    // select - to select SearchResultVector fields
});

export type Query = z.infer<typeof querySchema>;

export type SearchResultVector = {
    label: string;
    metadata: Record<string, string>;
    vector: number[];
    distance: number;
};

export type QueryResult = {
    result: SearchResultVector[];
};