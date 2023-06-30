import z from "zod";

export const regions = z.enum([
    "us-east-1",
    "eu-central-1",
    "us-west-1",
]);
export type Region = z.infer<typeof regions>;

export const memorySizes = z.number().min(128).max(10240);
export type MemorySize = z.infer<typeof memorySizes>;

export const ephemeralStorageSizes = z.number().min(128).max(10240);
export type EphemeralStorageSize = z.infer<typeof ephemeralStorageSizes>;