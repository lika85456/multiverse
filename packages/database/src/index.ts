import { v4 } from "uuid";
import { ENV } from "./env";
import { handlerGenerator } from "./handler";
import KNN from "./knn";
import { DynamoCollection } from "@multiverse/core/src/Collection/DynamoCollection";

function initializeCollection() {
    const {
        INDEX_TYPE, COLLECTIONS_DYNAMO_TABLE, DIMENSIONS
    } = ENV;

    if (INDEX_TYPE === "static") {
        throw new Error("Static collections are not supported yet");
    }

    if (INDEX_TYPE === "dynamic") {
        if (!COLLECTIONS_DYNAMO_TABLE) throw new Error("COLLECTIONS_DYNAMO_TABLE is not defined");

        return new DynamoCollection({
            region: "eu-central-1",
            table: COLLECTIONS_DYNAMO_TABLE,
            dimensions: DIMENSIONS
        });
    }

    throw new Error("INDEX_TYPE is not defined or invalid");
}

const instanceId = v4();

const knn = new KNN({ collection: initializeCollection() });

export const handler = handlerGenerator(knn, instanceId);