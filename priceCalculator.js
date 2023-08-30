function calculate(writes, reads, storedVectors, dimensions) {
    // writes
    const bytesPerVector = 500 + dimensions * 4; // 500 bytes for metadata, 4 bytes per dimension
    const writeUnitCost = 1.25 / 1_000_000; // $1.25 per million writes
    const writeCost = writes * bytesPerVector * writeUnitCost;
}