

export class Collections {
    public async create({
        name,
        region,
        dimensions
    }: {
        name: string;
        region: string;
        dimensions: string;
    }) {
        throw new Error("Not implemented");
    }

    public async delete(name: string){
        throw new Error("Not implemented");
    }

    public async list(){
        throw new Error("Not implemented");
    }
}

export class Collection {
    constructor(
        public readonly name: string,
        public readonly region: string,
        public readonly dimensions: number
    ){}
}