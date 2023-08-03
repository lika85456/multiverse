import SuperLambda from ".";
import { Lambda, Runtime } from "@aws-sdk/client-lambda";
import path from "path";
import adm from "adm-zip";

async function readCode(): Promise<Uint8Array> {
    const codePath = path.join(__dirname, "runtime.js");

    // start zipping to buffer
    const zip = new adm();

    zip.addLocalFile(codePath);
    const buffer = zip.toBuffer();

    return buffer;
};

/**
 * Updates the error states of all the lambdas
 * @see packages/super-lambda/src/runtime.js
 */
async function updateErrorStates(body: {
    errorSettings: { [lambdaName: string]: { failed: number, toFail: number, time: number }}
}, superLambda: SuperLambda) {
    const functions = await superLambda.functions();

    const settings = functions.reduce((acc, fn) => {
        acc[fn.name] = {
            // @ts-ignore
            failed: 0,
            // @ts-ignore
            toFail: 0,
            // @ts-ignore
            time: 0,
            ...body.errorSettings[fn.name]
        };

        return acc;
    }, {} as Record<string, { failed: number, toFail: number, time: number }>);

    await Promise.all(functions.map(async(fn) => {
        const lambda = new Lambda({ region: fn.region });

        // setup 5 instances of each lambda
        await Promise.all(new Array(5).fill(0).map(async() => {
            const res = await lambda.invoke({
                FunctionName: fn.name,
                InvocationType: "RequestResponse",
                Payload: JSON.stringify({
                    path: "/setup-error",
                    body: JSON.stringify({ errorSettings: settings })
                })
            });

            if (res.StatusCode !== 200) {
                throw new Error("Error setting up error states");
            }
        }));
    }));
}

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

    it("should output functions in correct order", async() => {
        const functions = await superLambda.functions();

        expect(functions.length).toBe(3);

        expect(functions[0].name.endsWith("m0")).toBe(true);
        expect(functions[1].name.endsWith("m1")).toBe(true);
        expect(functions[2].name.endsWith("eu-west-1")).toBe(true);
    });

    describe("Invoke falling back", () => {

        it("should invoke", async() => {
            const result = await superLambda.invoke({});
            expect(result.StatusCode).toBe(200);
        });

        it("should fail over first main region lambda", async() => {
            const functions = await superLambda.functions();

            const body = {
                errorSettings: {
                    [functions[0].name]: {
                        failed: 0,
                        toFail: 3,
                        time: 3000
                    },
                }
            };

            await updateErrorStates(body, superLambda);

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
            const functions = await superLambda.functions();

            const body = {
                errorSettings: {
                    [functions[0].name]: {
                        failed: 0,
                        toFail: 5,
                        time: 5000
                    },
                    [functions[1].name]: {
                        failed: 0,
                        toFail: 5,
                        time: 5000
                    }
                }
            };

            await updateErrorStates(body, superLambda);

            const result = await superLambda.invoke({
                body: JSON.stringify(body),
                path: "/test-error"
            }, {
                maxRetries: 3,
                maxTimeout: 500
            });

            const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
            const calledFunctionName = JSON.parse(parsedBody.body).context.functionName as string;

            expect(result.StatusCode).toBe(200);
            expect(calledFunctionName.endsWith("eu-west-1")).toBe(true);
        });

        it("should not fail over if secondary region is offline", async() => {
            const functions = await superLambda.functions();

            const body = {
                errorSettings: {
                    [functions[2].name]: {
                        failed: 0,
                        toFail: 5,
                        time: 5000
                    }
                }
            };

            await updateErrorStates(body, superLambda);

            const result = await superLambda.invoke({
                body: JSON.stringify(body),
                path: "/test-error"
            });

            const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
            const calledFunctionName = JSON.parse(parsedBody.body).context.functionName as string;

            expect(result.StatusCode).toBe(200);
            expect(calledFunctionName.endsWith("eu-west-1")).toBe(false);
        });

        it("should fail if all lambdas timing out", async() => {
            const functions = await superLambda.functions();

            const body = {
                errorSettings: {
                    [functions[0].name]: {
                        failed: 0,
                        toFail: 50,
                        time: 5000
                    },
                    [functions[1].name]: {
                        failed: 0,
                        toFail: 50,
                        time: 5000
                    },
                    [functions[2].name]: {
                        failed: 0,
                        toFail: 50,
                        time: 5000
                    }
                }
            };

            await updateErrorStates(body, superLambda);

            expect(superLambda.invoke({
                body: JSON.stringify(body),
                path: "/test-error"
            }, {
                maxRetries: 3,
                maxTimeout: 200
            })).rejects.toThrow();
        });
    });

    afterAll(async() => {
        await superLambda.destroy();
    });
});