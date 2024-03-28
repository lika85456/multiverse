import type { SearchResultVector } from "../core/Query";

export default function mergeResults(results: SearchResultVector[][]): SearchResultVector[] {
    const merged: SearchResultVector[] = [];

    const ids = new Set<string>();

    results.forEach(result => {
        result.forEach(item => {
            if (!ids.has(item.label)) {
                merged.push(item);
                ids.add(item.label);
            }
        });
    });

    const length = Math.max(...results.map(result => result.length));

    return merged.sort((a, b) => a.distance - b.distance).slice(0, length);
}