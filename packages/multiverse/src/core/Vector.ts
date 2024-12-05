import { z } from "zod";

export class Vector {
    constructor(private vector: number[]) {
    }

    public toArray(): number[] {
        return this.vector;
    }

    public toBase64(): string {
        return Buffer.from(this.vector).toString("base64");
    }

    public static fromBase64(base64: string): Vector {
        return new Vector(Array.from(Buffer.from(base64, "base64")));
    }

    public static random(size: number): number[] {
        const vector = [];

        for (let i = 0; i < size; i++) {
            // vector.push(Math.random());
            // use limited precision, some data get lost so tests are annoying
            vector.push(Math.floor(Math.random() * 100000) / 100000);
        }

        return vector;
    }
}

export const newVectorSchema = z.object({
    vector: z.array(z.number()),
    label: z.string(),
    metadata: z.record(z.string()).optional(),
});

export type NewVector = z.infer<typeof newVectorSchema>;