import type SuperLambda from "@multiverse/super-lambda/src";
import type { NewVector } from "../Vector";
import { Query, QueryResult } from "../Database/Query";

export default class IndexManager {
    constructor(private databaseLambda: SuperLambda) {

    }

    public async add(vector: NewVector) {
    }

    public async query(query: Query): QueryResult {

    }

    public async remove(label: string) {

    }

    public async count(): {
        vectors: number,
        vectorDimensions: number
        } {

    }
}