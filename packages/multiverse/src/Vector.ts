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
}

export type NewVector = {
    vector: Vector;
    label: string; // unique label
    metadata: Record<string, string>;
};