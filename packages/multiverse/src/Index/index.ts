import type {
    Query, SearchResultVector, StoredVector
} from "../Database/Vector";

export default interface Index {
    knn(query: Query): Promise<SearchResultVector[]>;
    add(vectors: StoredVector[]): Promise<void>;
    remove(ids: number[]): Promise<void>;

    size(): Promise<number>;
    dimensions(): Promise<number>;

    save(path: string): Promise<void>;
    load(path: string): Promise<void>;
}