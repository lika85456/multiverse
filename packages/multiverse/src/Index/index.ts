import type { SearchResultVector, StoredVector } from "../Database/Vector";
import type { Query } from "../Database/VectorDatabase";

export default interface Index {
    knn(query: Query): Promise<SearchResultVector[]>;
    add(vectors: StoredVector[]): Promise<void>;
    remove(ids: number[]): Promise<void>;
}