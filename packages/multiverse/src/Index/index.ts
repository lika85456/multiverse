import type { Query, SearchResultVector } from "../Database/Query";
import type { NewVector } from "../Vector";

export default interface Index {
    knn(query: Query): Promise<SearchResultVector[]>;
    add(vectors: NewVector[]): Promise<void>;
    remove(labels: string[]): Promise<void>;

    size(): Promise<number>;
    dimensions(): Promise<number>;

    save(path: string): Promise<void>;
    load(path: string): Promise<void>;
}