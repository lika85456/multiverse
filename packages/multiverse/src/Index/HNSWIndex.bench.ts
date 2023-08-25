import HNSWIndex from "./HNSWIndex";
import { bench } from "vitest";

describe.skip("HNSWIndex initializations", () => {
    const SIZES = [100, 1_000, 10_000];
    const DIMENSIONS = [3, 100, 768, 1536, 10_000];
    const SPACE_NAMES = ["l2", "ip", "cosine"];

    for (const size of SIZES) {
        for (const dimensions of DIMENSIONS) {
            for (const spaceName of SPACE_NAMES) {
                bench.skip(`Initializing index with ${size} vector size and ${dimensions} dimensions in ${spaceName}.`, () => {
                    new HNSWIndex({
                        dimensions,
                        size,
                        spaceName: "l2"
                    });
                });
            }
        }
    }
});