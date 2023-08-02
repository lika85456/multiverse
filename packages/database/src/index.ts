import { v4 } from "uuid";
import { ENV } from "./env";
import { handlerGenerator } from "./handler";
import KNN from "./knn";
import { DynamoCollection } from "@multiverse/core/dist/Collection/DynamoCollection";

function initializeCollection() {
    const { COLLECTION_CONFIG, DATABASE_CONFIG } = ENV;

    if (COLLECTION_CONFIG.type === "static") {
        throw new Error("Static collections are not supported yet");
    }

    if (COLLECTION_CONFIG.type === "dynamic") {
        return new DynamoCollection(DATABASE_CONFIG, COLLECTION_CONFIG);
    }

    throw new Error("INDEX_TYPE is not defined or invalid");
}

const instanceId = v4();

const knn = new KNN({ collection: initializeCollection() });

export const handler = handlerGenerator(knn, instanceId);