import type { Query, SearchResultVector } from "../core/Query";
import type { NewVector } from "../core/Vector";

export default interface Index {
    knn(query: Query): Promise<SearchResultVector[]>;
    add(vectors: NewVector[]): Promise<void>;
    remove(labels: string[]): Promise<void>;

    count(): Promise<number>;
    physicalSize(): Promise<number>;
    dimensions(): Promise<number>;

    save(path: string): Promise<void>;
    load(path: string): Promise<void>;
}