import log from "@multiverse/log";

export default function calculate({
    writes,
    reads,
    storedVectors,
    dimensions,
}: {
    writes: number;
    reads: number;
    storedVectors: number;
    dimensions: number;
}) {
    // writes
    const bytesPerVector = 500 + dimensions * 4; // 500 bytes for metadata, 4 bytes per dimension
    const readUnitCost = 0.25 / 1_000_000; // $0.25 per million reads
    const writeUnitCost = 1.25 / 1_000_000; // $1.25 per million writes

    const writeUnits = Math.ceil(bytesPerVector / 1_000);
    const writeCost = writes * writeUnitCost * writeUnits;

    // reads
    const readUnits = Math.ceil(bytesPerVector / 4_000);
    const readCost = reads * readUnitCost * readUnits;

    // storage
    const storageUnitCost = 0.25 / 1_000_000_000; // $0.25 per GB per month
    const storageCost = storedVectors * bytesPerVector * storageUnitCost;

    const lambdaCost = (writes + reads) * 0.0000002;
    const gatewayCost = (writes + reads) * 0.000001;

    return writeCost + readCost + storageCost + lambdaCost + gatewayCost;
}

log.debug(calculate({
    writes: 1_000_000,
    reads: 100_000_000,
    storedVectors: 10_000_000,
    dimensions: 1536,
}));