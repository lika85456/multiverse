import type { SearchResultVector } from "../Database/Vector";

export default function mergeResults(results: SearchResultVector[][]): SearchResultVector[] {
    const merged: SearchResultVector[] = [];

    const ids = new Set<number>();

    results.forEach(result => {
        result.forEach(item => {
            if (!ids.has(item.id)) {
                merged.push(item);
                ids.add(item.id);
            }
        });
    });

    const length = Math.max(...results.map(result => result.length));

    return merged.sort((a, b) => a.distance - b.distance).slice(0, length);
}