import { Collection } from "./Collection/Collection";
import { S3Url } from "./types";

export type IndexType = "hnsw";

export type IndexConfig = {
    mainRegion: string;
    name: string;
    partitionSize: number;
    indexType: IndexType;
};

export type Index = {
    id: string;
    partitions: S3Url[];
    collectionId: string;
    config: IndexConfig;
    createdAt: Date;
};