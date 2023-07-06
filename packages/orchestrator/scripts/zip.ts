import fs from "fs/promises";
import { promisify } from "util";

import { exec as execCb } from "child_process";

const exec = promisify(execCb);

const sourcePath = "dist";
const zipPath = "code.zip";
const zipDir = "/tmp/orchestratorZip";

void (async() => {
    console.info("Zipping code");
    await Promise.all([
        fs.rm(zipPath, { force: true }),
        fs.rm(zipDir, {
            force: true,
            recursive: true
        })
    ]);

    await fs.mkdir(zipDir);

    // remove zip.zip
    await fs.rm(zipPath, { force: true });

    // copy source
    console.info("Copying source");
    await fs.copyFile(`${sourcePath}/index.js`, `${zipDir}/index.js`);

    // copy node_modules
    console.info("Copying node_modules");
    await fs.cp(`${sourcePath}/../node_modules/`, `${zipDir}/node_modules`, { recursive: true });

    // zip
    console.info("Zipping");
    await exec(`zip -r ${zipPath} .`, {
        cwd: zipDir,
        maxBuffer: 1024 * 1024 * 100
    });
    await fs.copyFile(`${zipDir}/${zipPath}`, zipPath);

    // cleanup
    console.info("Cleaning up");
    await fs.rm(zipDir, {
        force: true,
        recursive: true
    });

    console.info("Done");
})();