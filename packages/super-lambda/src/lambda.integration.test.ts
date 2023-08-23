import SuperLambda from ".";
import { Runtime } from "@aws-sdk/client-lambda";
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

        if (!functions[0].name.endsWith("m0")) {
            console.error(functions);
        }

        expect(functions.length).toBe(3);

        expect(functions[0].name.endsWith("m0")).toBe(true);
        expect(functions[1].name.endsWith("m1")).toBe(true);
        expect(functions[2].name.endsWith("eu-west-1")).toBe(true);
    });

    it("should wake up multiple instances", async() => {
        const functions = await superLambda.functions();

        // this should invoke each function atleast 5 times
        await Promise.all(functions.map(async functionToInvoke => {
            const body = { errorSettings: { [functionToInvoke.name]: { time: 500 }, } };

            return await superLambda.invoke({
                body: JSON.stringify(body),
                path: "/timeout"
            }, {
                maxRetries: 5,
                maxTimeout: 10
            }).catch(e => e);
        }));
    });

    describe("Invoke falling back", () => {

        it.concurrent("should invoke", async() => {
            const result = await superLambda.invoke({});
            expect(result.StatusCode).toBe(200);
        });

        it.concurrent("should fail over first main region lambda", async() => {
            const functions = await superLambda.functions();

            const body = { errorSettings: { [functions[0].name]: { time: 5000 }, } };

            const result = await superLambda.invoke({
                body: JSON.stringify(body),
                path: "/timeout"
            }, {
                maxRetries: 5,
                maxTimeout: 500
            });

            expect(result.StatusCode).toBe(200);
            const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
            const calledFunctionName = JSON.parse(parsedBody.body).context.functionName;
            expect(calledFunctionName.split("-").pop()).toBe("m1");
        });

        it.concurrent("should fail over both main regions", async() => {
            const functions = await superLambda.functions();

            const body = {
                errorSettings: {
                    [functions[0].name]: { time: 5000 },
                    [functions[1].name]: { time: 5000 }
                }
            };

            const result = await superLambda.invoke({
                body: JSON.stringify(body),
                path: "/timeout"
            }, {
                maxRetries: 3,
                maxTimeout: 500
            });

            const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
            const calledFunctionName = JSON.parse(parsedBody.body).context.functionName as string;

            expect(result.StatusCode).toBe(200);
            expect(calledFunctionName.endsWith("eu-west-1")).toBe(true);
        });

        it.concurrent("should not fail over if secondary region is offline", async() => {
            const functions = await superLambda.functions();

            const body = { errorSettings: { [functions[2].name]: { time: 5000 } } };

            const result = await superLambda.invoke({
                body: JSON.stringify(body),
                path: "/timeout"
            });

            const parsedBody = JSON.parse(Buffer.from(result.Payload!).toString());
            const calledFunctionName = JSON.parse(parsedBody.body).context.functionName as string;

            expect(result.StatusCode).toBe(200);
            expect(calledFunctionName.endsWith("eu-west-1")).toBe(false);
        });

        it.concurrent("should fail if all lambdas timing out", async() => {
            const functions = await superLambda.functions();

            const body = {
                errorSettings: {
                    [functions[0].name]: { time: 5000 },
                    [functions[1].name]: { time: 5000 },
                    [functions[2].name]: { time: 5000 }
                }
            };

            expect(superLambda.invoke({
                body: JSON.stringify(body),
                path: "/timeout"
            }, {
                maxRetries: 3,
                maxTimeout: 500
            })).rejects.toThrow();
        });
    });

    it("should not hit cold start in at least 30 burst requests", async() => {
        const requests = [];

        let fallbacks = 0;

        async function request() {
            const start = Date.now();
            const result = await superLambda.invoke({});
            expect(result.StatusCode).toBe(200);
            const end = Date.now();

            fallbacks += result.fallbacks;

            if (end - start > 1000) {
                throw new Error("Cold start detected");
            }
        }

        for (let i = 0; i < 30; i++) {
            requests.push(request());
        }

        await Promise.all(requests);
        console.log(`Fallbacks: ${fallbacks}`);
    });

    afterAll(async() => {
        await superLambda.destroy();
    });
});