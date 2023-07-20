export type BaseDatabaseSettings = {
    name: string,
    region: string,
    // fallbackConcurrentInstances: number,
    // fallbackRegions: string[],
    memorySize: number,
    ephemeralStorageSize: number,
    // warmInterval: number,
};