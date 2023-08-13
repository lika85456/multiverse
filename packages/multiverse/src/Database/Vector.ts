export class Vector {
    constructor(private vector: number[]) {

    }

    public toArray(): number[] {
        return this.vector;
    }
}

export class Base64Vector extends Vector {
    constructor(private base64: string) {
        super([]);
    }

    public toArray(): number[] {
        return Array.from(Buffer.from(this.base64, "base64"));
    }

    public static fromArray(vector: number[]): Base64Vector {
        return new Base64Vector(Buffer.from(vector).toString("base64"));
    }

    public toString(): string {
        return this.base64;
    }
}

export type LabeledVector = {
    label: string;
    vector: Vector;
};

export type StoredVector = LabeledVector & {
    lastUpdate: number;
    deactivated?: true;
    id: number;
};

export type SearchResultVector = {
    id: number;
    distance: number;
};