/**
 * Run from root bun ./apps/example/index.ts
 */

import type { AwsToken } from "@multiverse/multiverse";
import Multiverse from "@multiverse/multiverse";
import log from "@multiverse/log";

const multiverse = new Multiverse({
    awsToken: undefined as unknown as AwsToken, // provide token in .env file
    name: "example-multiverse",
    region: "eu-west-1"
});

(async() => {
    const dimensions = 10;
    if (!(await multiverse.getDatabase("example-db"))) {
        await multiverse.createDatabase({
            dimensions,
            name: "example-db",
            region: "eu-west-1",
            secretTokens: [{
                name: "superSecretPassword",
                secret: "1234",
                validUntil: Number.MAX_SAFE_INTEGER / 1000
            }],
            space: "l2",
        });
    }

    const db = await multiverse.getDatabase("example-db");

    if (!db) {
        throw new Error("Database not found");
    }

    // push in 10 random vectors
    const vectors = Array.from({ length: 10 }, (_, i) => ({
        label: i + "",
        vector: Array.from({ length: dimensions }, () => Math.random())
    }));

    await db.add(vectors);

    // query the database
    const result = await db.query({
        k: 10,
        sendVector: true,
        vector: Array.from({ length: dimensions }, () => Math.random())
    });

    log.info(result);

    await multiverse.removeDatabase("example-db");

    await multiverse.destroySharedInfrastructure();
})();