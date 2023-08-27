import adm from "adm-zip";
import { exec } from "child_process";
import path from "path";

// eslint-disable-next-line turbo/no-undeclared-env-vars
export async function readCode(basePath = process.env.PWD): Promise<Uint8Array> {

    if (!basePath) {
        throw new Error("No base path provided");
    }

    const zip = new adm();

    zip.addLocalFolder(basePath);
    const buffer = zip.toBuffer();

    return buffer;
};

// eslint-disable-next-line turbo/no-undeclared-env-vars
export async function compileCode(basePath = process.env.PWD): Promise<Uint8Array> {

    if (!basePath) {
        throw new Error("No base path provided");
    }

    return new Promise((resolve, reject) => {
        exec("pnpm build", (error: any, stdout: any, stderr: any) => {
            if (error) {
                reject(error);

                return;
            }

            if (stderr) {
                reject(stderr);

                return;
            }

            resolve(readCode(path.join(basePath, "dist", "runtime.js")));
        });
    });
}