import type SuperLambda from "@multiverse/super-lambda/src";
import type { Query, VectorDatabaseQueryResult } from "../Database/Vector";
import type { NewVector } from "../Vector";

export default class IndexManager {
    constructor(private databaseLambda: SuperLambda) {

    }

    public async add(vector: NewVector) {
    }

    public async query(query: Query): VectorDatabaseQueryResult {

    }

    public async remove(label: string) {

    }

    public async count(): {
        vectors: number,
        vectorDimensions: number
        } {

    }
}