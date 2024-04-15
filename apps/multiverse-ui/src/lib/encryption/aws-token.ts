import * as crypto from "crypto";
import { ENV } from "@/lib/env";

const algorithm = "aes-256-cbc";
const secretKey = ENV.SECRET_KEY;

export const encryptSecretAccessKey = (accessKeyId: string, secretAccessKey: string): string => {
    // accessKeyId is 20 characters long, trim to 16
    const iv = Buffer.from(accessKeyId.slice(0, 16));
    const key = Buffer.from(secretKey);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(secretAccessKey), cipher.final()]);

    return encrypted.toString("hex");
};

export const decryptSecretAccessKey = (accessKeyId: string, encryptedSecretAccessKey: string): string => {
    // accessKeyId is 20 characters long, trim to 16
    const iv = Buffer.from(accessKeyId.slice(0, 16));
    const key = Buffer.from(secretKey);

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedSecretAccessKey, "hex")), decipher.final()]);

    return decrypted.toString();
};