import { createReadStream } from "fs";
import SuperLambda from ".";
import { Lambda, Runtime } from "@aws-sdk/client-lambda";
import path from "path";

const readCode = async() => {
    return new Promise<Uint8Array>((resolve, reject) => {
        const file = createReadStream(path.join(__dirname, "runtime.zip"));
        const chunks: Uint8Array[] = [];

        file.on("data", (chunk) => {
            chunks.push(new Uint8Array(Buffer.from(chunk)));
        });

        file.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        file.on("error", (error) => {
            reject(error);
        });
    });
};

describe("<Super Lambda>", () => {
    const superLambda = new SuperLambda({
        mainRegion: "eu-central-1",
        mainRegionFallbacks: 1,
        name: `multiverse-super-lambda-test-${Date.now()}`,
        secondaryRegions: ["eu-west-1"]
    });

    beforeAll(async() => {
        await superLambda.deploy({
            Code: { ZipFile: await readCode() },
            Handler: "runtime.handler",
            Role: "arn:aws:iam::529734186765:role/multiverse-database-lambda-role",
            Runtime: Runtime.nodejs18x,
            Timeout: 30,
        });
    });

    it("should invoke", async() => {
        const result = await superLambda.invoke({});
        expect(result.StatusCode).toBe(200);
    });

    it("should fail over first main region lambda", async() => {
        const body = {
            errorSettings: {
                "0": {
                    failed: 0,
                    toFail: 3,
                    time: 3000
                },
            }
        };

        const functions = await superLambda.functions();

        await Promise.all(functions.map(async(fn) => {
            const lambda = new Lambda({ region: fn.region });
            await lambda.invoke({
                FunctionName: fn.name,
                InvocationType: "RequestResponse",
                Payload: JSON.stringify({
                    path: "/setup-error",
                    body: JSON.stringify(body)
                })
            });
        }));

        const result = await superLambda.invoke({
            body: JSON.stringify(body),
            path: "/test-error"
        }, {
            maxRetries: 5,
            maxTimeout: 500
        });

        expect(result.StatusCode).toBe(200);
        const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
        const calledFunctionName = JSON.parse(parsedBody.body).context.functionName;
        expect(calledFunctionName.split("-").pop()).toBe("m1");
    });

    it("should fail over both main regions", async() => {
        const body = {
            errorSettings: {
                "0": {
                    failed: 0,
                    toFail: 3,
                    time: 3000
                },
                "1": {
                    failed: 0,
                    toFail: 3,
                    time: 3000
                }
            }
        };

        const functions = await superLambda.functions();

        await Promise.all(functions.map(async(fn) => {
            const lambda = new Lambda({ region: fn.region });
            await lambda.invoke({
                FunctionName: fn.name,
                InvocationType: "RequestResponse",
                Payload: JSON.stringify({
                    path: "/setup-error",
                    body: JSON.stringify(body)
                })
            });
        }));

        const result = await superLambda.invoke({
            body: JSON.stringify(body),
            path: "/test-error"
        }, {
            maxRetries: 3,
            maxTimeout: 500
        });

        expect(result.StatusCode).toBe(200);
        const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
        const calledFunctionName = JSON.parse(parsedBody.body).context.functionName as string;
        expect(calledFunctionName.endsWith("eu-west-1")).toBe(true);
    });

    afterAll(async() => {
        await superLambda.destroy();
    });
});