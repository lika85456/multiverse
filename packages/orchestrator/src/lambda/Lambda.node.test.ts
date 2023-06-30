import Lambda from "./Lambda";

describe("<Lambda>", () => {
    // it("should upload lambda", async() => {
    //     const codePath = "packages/orchestrator/src/lambda/code.zip";

    //     // read code to u8 array
    //     const code = await readFile(codePath);

    //     const u8int = new Uint8Array(code);

    //     const result = await createLambda(u8int, "TEST_lambda");

    //     expect(result).toBeDefined();

    //     // call lambda
    //     const lambda = new Lambda({ region: "eu-central-1" });
        
    //     const lambdaResult = await lambda.invoke({
    //         FunctionName: result,
    //         Payload: JSON.stringify({}),
    //     });

    //     console.log(lambdaResult);
    // });

    // afterEach(async ()=>{
    //     // remove 
    //     // await deleteLambda("TEST_lambda");
    // });

    it('should not exist', async () => {
        const lambda = new Lambda({
            codeZipPath: "packages/orchestrator/src/lambda/code.zip",
            ephemeralStorageSize: 512,
            memorySize: 256,
            name: "non_existing_lambda",
            region: "eu-central-1",
            timeout: 900,
        });

        const exists = await lambda.exists();

        expect(exists).toBeFalsy();
    });
});