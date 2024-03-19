export default class MetadataExpression {
    constructor(private expression: string) {
        //TODO: implement
    }

    public evaluate(_metadata: Record<string, string>): boolean {
        throw new Error("Not implemented");
    }
}